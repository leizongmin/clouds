/**
 * clouds base
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


/**
 * Clouds Base
 *
 * @param {Object} options
 *   - {String} type
 *   - {Object} redis {host, port, db, prefix}
 */
function CloudsBase (options) {
  options = options || {};

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = utils.uniqueId(options.type || 'base');
  var debug = this._debug = utils.debug(options.type + ':' + id);

  this._prefix = ns('redis.prefix') || define.redisPrefix;

  this._handlers = {};
  this._setHandler('message.message', function (msg) {
    this._debug('on message: @%s => %s', msg.sender, msg.args);
    this.emit('message', msg.sender, msg.args);
  });

  // create redis connection
  this._cs = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));
  this._cp = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));

  this._listen();
}

utils.inheritsEventEmitter(CloudsBase);

// 获得redis key
CloudsBase.prototype._key = function () {
  var list = Array.prototype.slice.call(arguments);
  if (this._prefix) list.unshift(this._prefix);
  return list.join(':');
};

// 处理默认的回调函数
CloudsBase.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

// 取redis客户端
CloudsBase.prototype._redis = function (name) {
  if (name === 'subscribe') return this._cs;
  if (name === 'publish') return this._cp;
};

// 开始监听消息
CloudsBase.prototype._listen = function (callback) {
  var me = this;
  var key = this._key('L', this.id);
  this._debug('start listen: key=%s', key);

  this._redis('subscribe').on('subscribe', function (channel, count) {
    me._debug('subscribe succeed: channel=%s, count=%s', channel, count);
    setTimeout(function () {
      me._debug('emit event: listen');
      me.emit('listen');
    }, define.emitListenDelay);
  });

  this._redis('subscribe').on('message', function (channel, msg) {
    me._debug('receive message: channel=%s, msg=%s', channel, msg);

    if (channel !== key) {
      me._debug(' - message from unknown channel: channel=%s', channel);
      return;
    }

    me._handleMessage(utils.parseMessage(msg));
  });

  this._redis('subscribe').subscribe(key, this._callback(callback));
};

// 设置消息处理程序
CloudsBase.prototype._setHandler = function (name, fn) {
  this._debug('set handler: %s => %s', name, fn);
  this._handlers[name] = fn;
};

// 获取消息处理程序
CloudsBase.prototype._getHandler = function (name) {
  return this._handlers[name];
};

// 处理收到的消息
CloudsBase.prototype._handleMessage = function (msg) {
  this._debug('handle message: sender=%s, id=%s, err=%s, args=%s', msg.sender, msg.id, msg.error, msg.args);

  var handler = this._getHandler('message.' + msg.type);
  if (typeof handler !== 'function') {
    this._debug('unknown message type: %s', msg.type);
    this.emit('unknown message', msg);
  }

  handler.call(this, msg);
};

/**
 * 发送消息
 *
 * @param {String} receiver
 * @param {Mixed} message
 * @param {Function} callback
 */
CloudsBase.prototype.send = function (receiver, message, callback) {
  this._debug('send: @%s => %s', receiver, message);

  var msg = utils.pocketSendMessage(this.id, message);
  this._sendMessage(receiver, msg);
};

CloudsBase.prototype._sendMessage = function (receiver, msg, callback) {
  var key = this._key('L', receiver);
  this._debug('send message: receiver=%s, key=%s', receiver, key);

  this._redis('publish').publish(key, msg.data, this._callback(callback));
};

/**
 * 退出
 *
 * @param {Function} callback
 */
CloudsBase.prototype.exit = function (callback) {
  this._debug('exit');

  // 关闭redis连接
  this._debug('exit: close redis connection');
  this._redis('publish').end();
  this._redis('subscribe').end();

  // 触发exit事件
  this.emit('exit', this);

  this._callback(callback);
};


module.exports = CloudsBase;
