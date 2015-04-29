/**
 * clouds base
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');
var Protocol = require('./protocol');
var Connection = require('./connection');


/**
 * Clouds Base
 *
 * @param {Object} options
 *   - {String} id
 *   - {String} type
 *   - {Object} redis {host, port, db, prefix}
 */
function CloudsBase (options) {
  options = options || {};
  options.type = options.type || 'base';

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = options.id = options.id || utils.uniqueId(options.type);
  var debug = this._debug = utils.debug(options.type + ':' + id);
  var me = this;

  this._protocol = new Protocol(this.id);

  this._handlers = {};
  this._setHandler('message.m', function (msg) {
    this._debug('on message: @%s => %s', msg.sender, msg.data);
    this.emit('message', msg.sender, msg.data);
  });

  this._connection = new Connection(options);
  this._connection.on('message', function (msg) {
    me._handleMessage(me._protocol.unpack(msg));
  });
  this._connection.on('listen', function () {
    me.emit('listen');
  });
}

utils.inheritsEventEmitter(CloudsBase);

// 获得redis key
CloudsBase.prototype._key = function () {
  var list = Array.prototype.slice.call(arguments);
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
  this._debug('handle message: sender=%s, type=%s, data=%s', msg.sender, msg.type, msg.data);

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

  var msg = this._protocol.packMessage(message);
  this._sendMessage(receiver, msg);
};

CloudsBase.prototype._sendMessage = function (receiver, msg, callback) {
  var key = this._key(receiver);
  this._debug('send message: receiver=%s, key=%s', receiver, key);

  this._connection.send(key, msg.raw, this._callback(callback));
};

/**
 * 退出
 *
 * @param {Function} callback
 */
CloudsBase.prototype.exit = function (callback) {
  var me = this;

  me._debug('exit');

  // 触发exit事件
  me.emit('exit', me);

  setTimeout(function () {
    // 关闭数据连接
    me._connection.exit(function () {
      me._callback(callback);
    });
  }, define.exitConnectionDelay);
};


module.exports = CloudsBase;
