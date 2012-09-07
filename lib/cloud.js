'use strict';

/**
 * cloud
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var cloud = module.exports;
var Service = cloud.Service = require('./service');
var RemoteService = cloud.RemoteService = require('./remote-service');
var utils = cloud.utils = require('./utils');
var parser = cloud.parser = require('./parser');
var redis = require('redis');
var debug = require('debug')('cloud');


// 默认配置
var defaultConfig = {
  redis: {                    // Redis服务器配置
    host:   '127.0.0.1',
    port:   6379,
    db:     0,
    prefix: ''
  },
  service: {
    callbackTimeout:  60000,  // 等待回调超时 默认为60秒
    baseScore:        1000,   // 服务初始分数，用于空闲进程排名
  },
  clean: {
    pingTimeout:      5000,   // ping进程超时
    auto:             true,   // 自动执行，当遇到调用远程服务超时会自动执行
    heartbeat:        10000,  // 心跳周期
    pendingTimeout:   60000,  // 清理无响应超时时间
  },
};


// 是否正在执行cloud.clean();
cloud._cleanPending = false;
// require的服务
cloud._requireServices = {};


/**
 * 连接到redis服务器
 *
 * @param {object} config
 */
cloud.connect = function (config) {
  config = config || {};
  for (var i in defaultConfig) {
    config[i] = utils.merge(defaultConfig[i], config[i] || {});
  }
  cloud._config = config;
  cloud._services = {};

  var pid = cloud.pid = utils.uniqueId();
  debug('connect: pid=' + pid);

  var createRedisConnection = function () {
    var client = redis.createClient(config.redis.port, config.redis.host);
    client.select(config.redis.db);
    client.on('error', parser.onError);
    return client;
  };

  cloud._redisKey = function (str) {
    return config.redis.prefix + str;
  };

  // 创建两个redis连接，一个用于发布、订阅消息，一个用于其他操作
  cloud._redis = createRedisConnection();
  cloud._redis2 = createRedisConnection();
  cloud._redis2.subscribe(cloud._redisKey('P:' + pid));
  cloud._redis2.on('message', parser.onMessage);

  // 心跳
  if (config.clean.heartbeat > 0) {
    cloud._heartbeatTid = setInterval(cloud.heartbeat, config.clean.heartbeat);
  }
};

/**
 * 注册服务
 *
 * @param {string} name
 * @param {object} options
 * @param {function} callback
 */
cloud.register = function (name, options, callback) {
  name = name.trim();
  if (!utils.testIdentifier(name)) {
    throw new Error('Bad service name "' + name + '".');
  }
  debug('register ' + name);
  if (typeof(options) === 'function') {
    callback = options;
    options = {};
  }
  
  options = utils.merge(defaultConfig.service, options);
  var service = new Service(name, options);
  parser.registerService(name, service, function (err) {
    if (err) return callback(err);

    cloud._services[name] = service;
    callback(null, service);
  });
};

/**
 * 注销服务
 *
 * @param {string} name
 * @param {function} callback
 */
cloud.unregister = function (name, callback) {
  debug('unregister ' + name);
  callback = callback || function () {};
  parser.unregisterService(name, function (err) {
    if (err) return callback(err);

    delete cloud._services[name];
    callback(null);
  });
};

/**
 * 返回指定服务器的调用
 *
 * @param {string} name 服务名只能为数字、字母和特殊字符：- / . :
 * @param {object} options
 */
cloud.require = function (name, options) {
  var name = name.trim();
  if (!utils.testIdentifier(name)) {
    throw new Error('Bad service name "' + name + '".');
  }
  if (cloud._requireServices[name]) {
    debug('require cache: service=' + name);
    return cloud._requireServices[name];
  } else {
    debug('require new: service=' + name);
    options = utils.merge(cloud._config.service, options);
    var service = new RemoteService(name, options);
    cloud._requireServices[name] = service;
    return service;
  }
};

/**
 * 维护服务进程列表
 * 仅对自己注册的服务进行清理
 *
 * @param {function} callback
 */
cloud.clean = function (callback) {
  if (cloud._cleanPending) {
    if (Date.now() - cloud._cleanTimestamp < cloud._config.clean.pendingTimeout) {
      debug('clean pending: timestamp=' + cloud._cleanTimestamp);
      return;
    } else {
      debug('reset clean');
    }
  }
  cloud._cleanPending = true;
  cloud._cleanTimestamp = Date.now();

  var services = Object.keys(cloud._services)
                .concat(Object.keys(cloud._requireServices));
  var _services = services.slice();
  debug('related service: count=' + services.length);
  
  var start = function () {
    getPids();
  };
  
  /**
   * 取指定名称的service实例
   */
  var getService = function (name) {
    return cloud._services[name] || cloud._requireServices[name];
  };
  
  /**
   * 取进程相关列表
   */
  var getPids = function () {
    var getNext = function () {
      var s = services.pop();
      if (!s) return checkPids();

      var service = getService(s);
      if (!service) return getNext();
      service.relatedProcess(function (err, pids) {
        if (err) {
          pids = [];
        }
        debug('related pid: service=' + s + ' count=' + pids.length);
        getNext();
      });
    };
    getNext();
  };

  /**
   * 检查相关进程在线情况
   */
  var checkPids = function () {
    var ps = {};
    var pids = [];
    _services.forEach(function (n) {
      var s = getService(n);
      s._pid.forEach(function (pid) {
        if (pid === cloud.pid) return;
        if (!ps[pid]) {
          ps[pid] = [];
          pids.push(pid);
        }
        ps[pid].push(s.name);
      });
    });
    debug('related pid: total=' + pids.length);
    /*
    var checkNext = function () {
      var pid = pids.pop();
      if (!pid) return done();
      parser.pingProcess(pid, function (err, online) {
        if (err) {
          debug('ping process fail: pid=' + pid + ' ' + err.stack);
          return checkNext();
        }
        if (!online) {
          debug('process offline: pid=' + pid);
          var s = ps[pid];
          if (s.length < 1) return checkNext();
          var multi = cloud._redis.multi();
          s.forEach(function (s2) {
            var key = cloud._redisKey('S:' + s2);
            multi.zrem(key, pid);
          });
          multi.exec(function (err) {
            if (err) debug('clean process fail: pid=' + pid);
            checkNext();
          });
        }
      });
    }
    checkNext();
    */
    var count = 0;
    var pindDone = function () {
      count++;
      if (count >= pids.length) {
        done();
      }
    };
    pids.forEach(function (pid, i) {
      setTimeout(function () {
        parser.pingProcess(pid, function (err, online) {
          if (err) {
            debug('ping process fail: pid=' + pid + ' ' + err.stack);
            return pindDone();
          }
          if (!online) {
            debug('process offline: pid=' + pid);
            var s = ps[pid];
            if (s.length < 1) return pindDone();
            var multi = cloud._redis.multi();
            s.forEach(function (s2) {
              var key = cloud._redisKey('S:' + s2);
              multi.zrem(key, pid);
            });
            multi.exec(function (err) {
              if (err) debug('clean process fail: pid=' + pid);
              pindDone();
            });
          }
        });
      }, 100 * i);
    });
  };

  // 检查完成
  var done = function () {
    debug('clean done');
    cloud._cleanPending = false;
    if (typeof(callback) === 'function') {
      callback(null);
    }
  };

  // 开始
  start();
};

/**
 * 检查自身注册的服务的状态
 *
 * @param {function} callback
 */
cloud.heartbeat = function (callback) {
  debug('heartbeat');
  var services = Object.keys(cloud._services);

  var start = function () {
    var checkNext = function () {
      var s = services.pop();
      if (!s) return done();
      cloud._services[s].heartbeat(function (err, ok) {
        checkNext();
      });
    };
    checkNext();
  };

  var done = function () {
    if (typeof(callback) === 'function') return callback(null); 
  };

  start();
};

/**
 * 断开连接
 */
cloud.disconnect = function () {
  debug('disconnect');
  if (cloud._services) {
    for (var s in cloud._services) {
      cloud.unregister(s);
    }
  }
};


// 程序退出时，自动注销各服务
process.on('exit', function () {
  debug('process exit');
  cloud.disconnect();
});
