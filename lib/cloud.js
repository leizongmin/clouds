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
    concurrentCall:   100     // 服务默认可提供的同时调用次数，用于空闲进程排名
  },
  clean: {
    pingTimeout:      2000,   // ping进程超时
  }
};


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
};

/**
 * 注册服务
 *
 * @param {string} name
 * @param {object} options
 * @param {function} callback
 */
cloud.register = function (name, options, callback) {
  debug('register ' + name);
  if (typeof options === 'function') {
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
 * @param {string} name
 * @param {object} options
 */
cloud.require = function (name, options) {
  debug('require ' + name);
  options = utils.merge(cloud._config.service, options);
  return new RemoteService(name, options);
};

/**
 * 维护服务进程列表
 * 仅对自己注册的服务进行清理
 *
 * @param {function} callback
 */
cloud.clean = function (callback) {
  var services = [];
  for (var s in cloud._services) {
    services.push(s);
  }
  var _services = services.slice();
  debug('related service: count=' + services.length);

  var start = function () {
    getPids();
  };

  /**
   * 取进程相关列表
   */
  var getPids = function () {
    var getNext = function () {
      var s = services.pop();
      if (!s) return checkPids();

      cloud._services[s].relatedProcess(function (err, pids) {
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
    for (var i in cloud._services) {
      var s = cloud._services[i];
      s._pid.forEach(function (pid) {
        if (pid === cloud.pid) return;
        if (!ps[pid]) {
          ps[pid] = [];
          pids.push(pid);
        }
        ps[pid].push(s.name);
      });
    }
    debug('related pid: total=' + pids.length);

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
  };

  // 检查完成
  var done = function () {
    debug('clean done');
    if (typeof callback === 'function') {
      callback(null);
    }
  };

  // 开始
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
