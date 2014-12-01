'use strict';

/**
 * cloud.RemoteService
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var cloud = require('./cloud');
var parser = require('./parser');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var debug = require('debug')('clouds:RemoteService');


/**
 * 创建一个RemoteService实例
 *
 * @param {string} name
 * @param {object} options
 * @return {object}
 */
var RemoteService = module.exports = function (name, options) {
  if (!(this instanceof RemoteService)) return new RemoteService(name, options);

  this.name = name;
  options = options || {};
  this.options = options;
  this._pid = [];
};

inherits(RemoteService, EventEmitter);
RemoteService.prototype._emit = RemoteService.prototype.emit;

/**
 * 触发事件
 * 如果最后一个参数是function，则认为是回调函数
 * 可以传递参数 emit('event', arg1, arg2, arg3, callback)
 * 无回调传递参数 emit('event', arg1, arg2, arg3)
 *
 * @param {string} event
 * @param {function} callback
 */
RemoteService.prototype.emit = function (event, callback) {
  var self = this;
  var args = [];
  for (var i = 1; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  if (typeof(args[args.length - 1]) === 'function') {
    var needCheckTimeout = true;
    callback = args.pop();
  } else {
    var needCheckTimeout = false;
    callback = function () {};
  }

  var tid = 0;

  // 调用远程服务
  cloud.parser.serviceEmit(this.name, event, args, function () {
    clearTimeout(tid);
    callback.apply(null, arguments);
  }, needCheckTimeout);

  // 超时检查
  var callbackTimeout = this.options.callbackTimeout;
  needCheckTimeout = needCheckTimeout && callbackTimeout > 0;
  if (needCheckTimeout) {
    tid = setTimeout(function () {
      debug('emit timeout: service=' + self.name + ' event=' + event);
      var _callback = callback;
      _callback(new Error('Timeout'));
      callback = function () {};

      // 调用cloud.clean()来维护在线进程
      if (cloud._config.clean.auto) {
        cloud.clean();
      }
    }, callbackTimeout);
  }
};

/**
 * 触发事件，指定可允许失败的次数，若出错则尝试多次
 *
 * @param {int} count -1表示无限次
 * @param {string} event
 * @param {function} callback
 */
RemoteService.prototype.pemit = function (count, event, callback) {
  var self = this;
  var args = [];
  for (var i = 1; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  callback = args.pop();

  if (count < 1 && count !== -1) {
    return callback(new Error('The first parameter is wrong.'));
  }

  args.push(function (err) {
    if (err && /timeout/img.test(err.toString())) {
      debug('emit timeout: service=' + self.name + ' event=' + event);
      process.nextTick(tryEmit);
    } else {
      callback.apply(null, arguments);
    }
  });

  var tryCount = 0;
  var tryEmit = function () {
    tryCount++;
    if (count !== -1 && tryCount > count) {
      callback(new Error('Timeout'));
    } else {
      debug('try emit: count=' + tryCount + ' service=' + self.name + ' event=' + event);
      self.emit.apply(self, args);
    }
  };
  tryEmit();
};

/**
 * 更新相关进程列表
 *
 * @param {function} callback
 */
RemoteService.prototype.relatedProcess = function (callback) {
  var self = this;
  var name = this.name;

  var key = cloud._redisKey('S:' + name);
  cloud._redis.zrange(key, 0, -1, function (err, pids) {
    if (err) {
      debug('get related pids fail: ' + err.stack);
      return callback(err);
    }
    debug('related pid: service=' + name + ' count=' + pids.length);
    self._pid = pids;
    callback(null, self._pid);
  });
};

/**
 * 取服务配置
 *
 * @param {string} name
 * @param {function} callback
 */
RemoteService.prototype.get = function (name, callback) {
  parser.getServiceConfig(this.name, name, callback);
};

/**
 * 设置服务配置
 *
 * @param {string} name
 * @param {object} value
 * @param {function} callback
 */
RemoteService.prototype.set = function (name, value, callback) {
  parser.setServiceConfig(this.name, name, value, callback);
};

/**
 * 删除服务配置
 *
 * @param {string} name
 * @param {function} callback
 */
RemoteService.prototype.remove = function (name, callback) {
  parser.removeServiceConfig(this.name, name, callback);
};
