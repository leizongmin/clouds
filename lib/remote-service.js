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
  var args = [];
  for (var i = 1; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  if (typeof(args[args.length - 1]) === 'function') {
    callback = args.pop();
  } else {
    callback = function () {};
  }

  cloud.parser.serviceEmit(this.name, event, args, callback);
};
