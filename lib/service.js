'use strict';

/**
 * cloud.Service
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var cloud = require('./cloud');
var parser = require('./parser');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var debug = require('debug')('clouds:Service');


/**
 * 创建一个Service实例
 *
 * @param {string} name
 * @param {object} options
 * @return {object}
 */
var Service = module.exports = function (name, options) {
  if (!(this instanceof Service)) return new Service(name, options);

  this.name = name;
  options = options || {};
  this.options = options;
  this._pid = [];
};

inherits(Service, EventEmitter);

/**
 * 更新相关进程列表
 *
 * @param {function} callback
 */
Service.prototype.relatedProcess = function (callback) {
  var self = this;
  var name = this.name;

  var key = cloud._redisKey('S:' + name);
  cloud._redis.zrange(key, [0, -1], function (err, pids) {
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
 * 检查自身状态
 * 若因为某次调用失败，导致发起进程把该服务清理了，此方法会重新注册服务
 * 
 * @param {function} callback
 */
Service.prototype.heartbeat = function (callback) {
  var self = this;
  var name = this.name;
  var pid = cloud.pid;
  
  var key = cloud._redisKey('S:' + name);
  cloud._redis.zscore(key, pid, function (err, score) {
    if (err) {
      debug('heartbeat fail: ' + err.stack);
      return callback(err);
    }
    if (score !== null) return callback(null, true);
    parser.registerService(name, self, function (err) {
      if (err) return callback(err);
      debug('reregister: service=' + name);
      callback(null, false);
    });
  });
};

/**
 * 取服务配置
 *
 * @param {string} name
 * @param {function} callback
 */
Service.prototype.get = function (name, callback) {
  parser.getServiceConfig(this.name, name, callback);
};

/**
 * 设置服务配置
 *
 * @param {string} name
 * @param {object} value
 * @param {function} callback
 */
Service.prototype.set = function (name, value, callback) {
  parser.setServiceConfig(this.name, name, value, callback);
};

/**
 * 删除服务配置
 *
 * @param {string} name
 * @param {function} callback
 */
Service.prototype.remove = function (name, callback) {
  parser.removeServiceConfig(this.name, name, callback);
};
