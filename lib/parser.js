'use strict';

/**
 * cloud.parser
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var cloud = require('./cloud');
var utils = require('./utils');
var parser = module.exports;
var debug = require('debug')('clouds:parser');


// 常量
var MESSAGE = {
  TYPE: {
    EMIT:       1,    // 触发服务事件
    CALLBACK:   2,    // 事件回调
    PING:       3     // 用于检查进程是否在线
  }
};


// 等待队列
var _callback = parser._callback = {};

/**
 * 处理消息出错
 *
 * @param {object|string} err
 */
parser.onError = function (err) {
  console.error(err.stack);
};

/**
 * 处理进程消息
 *
 * @param {string} channel
 * @param {string} msg
 */
parser.onMessage = function (channel, msg) {
  try {
    msg = JSON.parse(msg);
  } catch (err) {
    parser.onError(err);
  }

  if (parser._type[msg.t]) {
    debug('on message: type=' + msg.t);
    parser._type[msg.t](msg);
  } else {
    debug('unknown message: type=' + msg.t);
  }
};

/**
 * 注册服务
 *
 * @param {string} name
 * @param {object} service
 * @param {function} callback
 */
parser.registerService = function (name, service, callback) {
  var pid = cloud.pid;
  var baseScore = service.options.baseScore;
  var key = cloud._redisKey('S:' + name);
  cloud._redis.zadd(key, baseScore, pid, callback);
};

/**
 * 注销服务
 *
 * @param {string} name
 * @param {function} callback
 */
parser.unregisterService = function (name, callback) {
  var key = cloud._redisKey('S:' + name);
  var pid = cloud.pid;
  cloud._redis.zrem(key, pid, callback);
};

/**
 * 触发某个服务的事件
 *
 * @param {string} name
 * @param {string} event
 * @param {array} args
 * @param {function} callback
 * @param {bool} changeScore
 */
parser.serviceEmit = function (name, event, args, callback, changeScore) {
  try {
    var msg = {
      p:  cloud.pid,
      m:  utils.uniqueId(),
      t:  MESSAGE.TYPE.EMIT,
      s:  name,
      e:  event,
      a:  args
    };
    var _msg = JSON.stringify(msg);
  } catch (err) {
    return callback(err);
  }

  var key = cloud._redisKey('S:' + name);
  cloud._redis.zrevrange(key, 0, 0, function (err, pids) {
    if (err) return callback(err);
    var pid = pids[0];
    if (!pid) {
      debug('service undefined: service=' + name);
      return callback(new Error('Service "' + name + '" is undefined.'));
    }

    // 发出调用通知
    debug('emit pid=' + pid + ' service=' + name + ' event=' + event);
    var key = cloud._redisKey('P:' + pid);
    cloud._redis.publish(key, _msg, function (err) {
      if (err) return callback(err);

      parser.bindCallback(msg, function () {
        incrBy(1);
        callback.apply(null, arguments);
      });
    });

    // 对服务调用次数进行统计
    var key2 = cloud._redisKey('S:' + name);
    var incrBy = function (n) {
      if (changeScore) {
        cloud._redis.zincrby(key2, n, pid, function (err) {
          if (err) parser.onError(err);
        });
      }
    };
    incrBy(-1);
  });
};

/**
 * 绑定回调函数
 *
 * @param {object} msg
 * @param {function} callback
 */
parser.bindCallback = function (msg, callback) {
  var mid = msg.m;
  _callback[mid] = function () {
    delete _callback[mid];
    callback.apply(null, arguments);
  };
};

/**
 * 回调
 *
 * @param {string} pid
 * @param {string} mid
 * @param {array} args
 */
parser.sendCallback = function (pid, mid, args) {
  try {
    if (!Array.isArray(args)) {
      var _args = [];
      for (var i in args) {
        _args.push(args[i]);
      }
      args = _args;
    }
    var msg = {
      p:  pid,
      m:  mid,
      t:  MESSAGE.TYPE.CALLBACK,
      a:  args
    };
    var _msg = JSON.stringify(msg);
  } catch (err) {
    debug('send callback error: ' + err.stack);
    return parser.onError(err);
  }

  var key = cloud._redisKey('P:' + pid);
  cloud._redis.publish(key, _msg, function (err) {
    if (err) return parser.onError(err);
  });
};

/**
 * 检查进程是否在线
 *
 * @param {string} pid
 * @param {function} callback
 */
parser.pingProcess = function (pid, callback) {
  var msg = {
    p:  cloud.pid,
    m:  utils.uniqueId(),
    t:  MESSAGE.TYPE.PING
  };

  var tid = 0;

  // 发送ping消息
  var _msg = JSON.stringify(msg);
  var key = cloud._redisKey('P:' + pid);
  cloud._redis.publish(key, _msg, function (err) {
    if (err) return callback(err);
    parser.bindCallback(msg, function () {
      clearTimeout(tid);
      callback.apply(null, arguments);
    });
  });

  // 检查超时
  var callbackTimeout = cloud._config.clean.pingTimeout;
  tid = setTimeout(function () {
    debug('ping timeout: PID=' + pid);
    var _callback = callback;
    _callback(null, false);
    callback = function () {};
  }, callbackTimeout);
};

/**
 * 设置服务配置
 *
 * @param {string} service
 * @param {string} name
 * @param {object} value
 * @param {function} callback
 */
parser.setServiceConfig = function (service, name, value, callback) {
  try {
    value = JSON.stringify(value);
  } catch (err) {
    return callback(err);
  }

  var key = cloud._redisKey('C:' + service + ':' + name);
  cloud._redis.set(key, value, callback);
};

/**
 * 取服务配置
 *
 * @param {string} service
 * @param {string} name
 * @param {function} callback
 */
parser.getServiceConfig = function (service, name, callback) {
  var key = cloud._redisKey('C:' + service + ':' + name);
  cloud._redis.get(key, function (err, data) {
    if (err) return callback(err);

    try {
      data = JSON.parse(data);
    } catch (err) {
      return callback(err);
    }

    callback(null, data);
  });
};

/**
 * 删除服务配置
 *
 * @param {string} service
 * @param {string} name
 * @param {function} callback
 */
parser.removeServiceConfig = function (service, name, callback) {
  var key = cloud._redisKey('C:' + service + ':' + name);
  cloud._redis.del(key, callback);
};


// 解析消息类型
parser._type = {};

/**
 * 解析emit消息
 */
parser._type[MESSAGE.TYPE.EMIT] = function (msg) {
  var s = cloud._services[msg.s];
  if (!s) {
    debug('undefined service: service=' + msg.s);
    parser.sendCallback(msg.p, msg.m, ['Service is "' + msg.s + '" is undefined on PID:' + cloud.pid]);
  } else {
    debug('emit: service=' + msg.s + ' event=' + msg.e);
    var args = [msg.e].concat(msg.a).concat(function () {
      parser.sendCallback(msg.p, msg.m, arguments);
    });
    s.emit.apply(s, args);
  }
};

/**
 * 解析callback消息
 */
parser._type[MESSAGE.TYPE.CALLBACK] = function (msg) {
  var f = _callback[msg.m];
  if (!f) {
    debug('undefined callback: mid=' + msg.m);
  } else {
    debug('callback: mid=' + msg.m);
    f.apply(null, msg.a);
  }
};

/**
 * 解析ping消息
 */
parser._type[MESSAGE.TYPE.PING] = function (msg) {
  debug('ping: Remote PID=' + msg.p);
  parser.sendCallback(msg.p, msg.m, [null, true]);
};
