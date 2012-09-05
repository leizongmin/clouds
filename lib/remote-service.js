'use strict';

/**
 * cloud.RemoteService
 *
 * Service对象
 */

var cloud = require('./cloud');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var debug = require('debug')('RemoteService');


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
};

inherits(RemoteService, EventEmitter);
RemoteService.prototype._emit = RemoteService.prototype.emit;

/**
 * 触发事件
 * 如果最后一个参数是function，则认为是回调函数
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

  var callbackFlag = false;
  var tid = 0;

  // 调用远程服务
  cloud.parser.serviceEmit(this.name, event, args, function () {
    callbackFlag = true;
    clearTimeout(tid);
    callback.apply(null, arguments);
  });

  // 超时检查
  var callbackTimeout = this.options.callbackTimeout;
  needCheckTimeout = needCheckTimeout && callbackTimeout > 0;
  if (needCheckTimeout) {
    tid = setTimeout(function () {
      if (!callbackFlag) {
        debug('emit timeout: service=' + self.name + ' event=' + event);
        var _callback = callback;
        _callback(new Error('Timeout'));
        callback = function () {};
      }
    }, callbackTimeout);
  }
};
