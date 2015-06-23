/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var util = require('util');
var events = require('events');
var os = require('os');
var leiNS = require('lei-ns');
var createDebug = require('debug');
var utils = require('lei-utils');
var Redis = require('ioredis');
var define = require('./define');
module.exports = exports = utils.merge(utils, exports);


exports.debug = function (n) {
  return createDebug('clouds:' + n);
};

exports.createNamespace = function (data) {
  var ns = new leiNS.Namespace();
  Object.keys(data).forEach(function (k) {
    ns(k, data[k]);
  });
  return ns;
};

/**
 * 取唯一标识符
 *
 * @param {String} type 类型，可选s或c
 * @return {String}
 */
exports.uniqueId = function (type) {
  // 与当前主机名字相关，但考虑到主机名可能会很长，使用部分MD5值
  var name = utils.md5(os.hostname()).substr(0, 8);
  type = type.toLowerCase().substr(0, 1);
  var ret = [type, name, process.pid, exports.uniqueId.counter++].join('.');

  debug('generate uniqueId: %s', ret);
  return ret;
};

exports.uniqueId.counter = 0;

/**
 * 继承EventEmitter
 *
 * @param {Function} fn
 */
exports.inheritsEventEmitter = function (fn) {
  util.inherits(fn, events.EventEmitter);
};

/**
 * 继承CloudsBase
 *
 * @param {Function} fn
 */
exports.inheritsBase = function (fn) {
  util.inherits(fn, require('./base'));
};

/**
 * 创建Redis连接
 *
 * @param {Object} options
 * @return {Object}
 */
exports.createRedisConnection = function (options) {
  options = options || {};
  options.host = options.host || define.redisHost;
  options.port = options.port || define.redisPort;
  options.db = options.db || define.redisDb;
  options.password = options.password || options.auth_pass;
  var client = new Redis(options);
  debug('create redis connection: %s:%s [%s]', options.host, options.port, options.db);
  return client;
};




var debug = exports.debug('utils');
