'use strict';

/**
 * cloud.Service
 *
 * Service对象
 */

var cloud = require('./cloud');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var debug = require('debug')('Service');


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
