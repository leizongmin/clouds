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
 * @param {object} options
 * @return {object}
 */
var Service = module.exports = function (options) {
  if (!(this instanceof Service)) return new Service(options);

  options = options || {};
  this.options = options;
};

inherits(Service, EventEmitter);

