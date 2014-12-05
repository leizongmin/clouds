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
var redis = require('redis');
var define = require('./define');
module.exports = exports = utils;


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
 * 创建Redis连接
 *
 * @param {String} host
 * @param {Number} port
 * @param {Number} db
 * @return {Object}
 */
exports.createRedisConnection = function (host, port, db) {
  host = host || define.redisHost;
  port = port || define.redisPort;
  db = db || define.redisDb;
  var client = redis.createClient(port, host);
  if (db > 0) {
    client.select(db);
  }
  debug('create redis connection: %s:%s [%s]', host, port, db);
  return client;
};

/**
 * 打包调用服务消息
 *
 * @param {String} clientId
 * @param {String} name
 * @param {Array} args
 * @return {Object}
 */
exports.pocketCallMessage = function (clientId, name, args) {
  args = Array.prototype.slice.call(args);

  var data = {
    i: clientId,               // 客户端ID
    m: utils.randomString(8),  // 消息ID
    n: name,                   // 调用的服务名
    a: args
  };

  return {
    id: data.m,
    data: 'C' + JSON.stringify(data)
  };
};

/**
 * 打包服务结果消息
 *
 * @param {String} serverId
 * @param {String} messageId
 * @param {Object} err
 * @param {Array} args
 * @return {Object}
 */
exports.pocketResultMessage = function (serverId, messageId, err, args) {
  args = Array.prototype.slice.call(args);

  var data = {
    i: serverId,   // 服务端ID
    m: messageId,  // 消息ID
    a: args
  };

  if (err) {
    var e = {};
    e.message = err.message;
    Object.keys(err).forEach(function (k) {
      e[k] = err[k];
    });
    data.e = e;
  }

  return {
    id: data.m,
    data: 'R' + JSON.stringify(data)
  };
};

/**
 * 解析消息
 *
 * @param {String} msg
 * @return {Object}
 */
exports.parseMessage = function (msg) {
  var t = String(msg).substr(0, 1);
  msg = msg.slice(1);

  var ret = {};
  if (t === 'C') ret.type = 'call';
  else if (t === 'R') ret.type = 'result';
  else ret.type = 'unknown';

  try {
    var data = JSON.parse(msg);
  } catch (err) {
    ret.error = err;
    return ret;
  }

  ret.raw = msg;
  ret.sender = data.i;  // 发送者
  ret.id = data.m;      // 消息ID
  ret.args = data.a;    // 参数
  ret.name = data.n;    // 调用的服务名称

  if (data.e) {
    // 出错信息
    var err = new Error(data.e.message);
    Object.keys(data.e).forEach(function (k) {
      err[k] = data.e[k];
    });
    ret.error = err;
  }

  return ret;
};


var debug = exports.debug('utils');
