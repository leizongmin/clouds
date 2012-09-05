'use strict';

/**
 * cloud.parser
 *
 * Service对象
 */

var cloud = require('./cloud');
var utils = require('./utils');
var parser = module.exports;
var debug = require('debug')('parser');


// 常量
var MESSAGE = {
  TYPE: {
    EMIT:       1,    // 触发服务事件
    CALLBACK:   2     // 事件回调
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
  var concurrentCall = service.options.concurrentCall;
  var key = cloud._redisKey('S:' + name);
  cloud._redis.zadd(key, concurrentCall, pid, callback);
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
 */
parser.serviceEmit = function (name, event, args, callback) {
  try {
    var msg = {
      p:  cloud.pid,
      m:  utils.uniqueId(),
      t:  MESSAGE.TYPE.EMIT,
      s:  name,
      e:  event,
      a:  args
    };
    msg = JSON.stringify(msg);
  } catch (err) {
    return callback(err);
  }

  var key = cloud._redisKey('S:' + name);
  cloud._redis.sort(key, ['LIMIT', 0, 1], function (err, pids) {
    if (err) return callback(err);
    var pid = pids[0];
    if (!pid) {
      debug('service undefined: service=' + name);
      return callback(new Error('Service "' + name + '" is undefined.'));
    }

    debug('emit pid=' + pid + ' service=' + name + ' event=' + event);
    var key = cloud._redisKey('P:' + pid);
    cloud._redis.publish(key, msg, function (err) {
      if (err) return callback(err);
      
      parser.bindCallback(msg, callback);
    });
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
  _callback[msg.m] = function () {
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
    var msg = {
      p:  pid,
      m:  mid,
      t:  MESSAGE.TYPE.CALLBACK,
      a:  args
    };
    msg = JSON.stringify(msg);
  } catch (err) {
    return callback(err);
  }

  var key = cloud._redisKey('P:' + pid);
  cloud._redis.publish(key, msg, function (err) {
    if (err) return parser.onError(err);
  });
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
    parser.sendCallback(msg.p, msg.m, 'Service is "' + msg.s + '" is undefined on PID:' + cloud.pid);
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
    f.apply(null, msg.args);
  }
};
