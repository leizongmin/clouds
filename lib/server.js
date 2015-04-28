/**
 * clouds server
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


/**
 * Clouds Server
 *
 * @param {Object} options
 *   - {Object} redis {host, port, db, prefix}
 *   - {Number} heartbeat (s)
 */
function CloudsServer (options) {
  options = options || {};
  if (!(options.heartbeat > 0)) options.heartbeat = define.heartbeat;

  // 初始化CloudsBase
  options.type = 'server';
  CloudsServer.super_.call(this, options);

  var me = this;

  this._heartbeat = options.heartbeat;

  this._services = {};
  this._messages = {};

  this._heartbeatTid = setInterval(function () {
    me._keepHeartbeat();
  }, this._ns('heartbeat') * 1000);

  // 退出时的清理工作
  this.once('exit', function (me) {
    // 删除所有相关key
    var key = me._key('*' + me.id + '*');
    me._debug('exit: query all related redis keys=%s', key);
    me._connection.keys(key, function (err, list) {
      if (err) return callback(err);
console.log(key || 'empty', err || 'empty', list || 'empty');
      if (Array.isArray(list) && list.length > 0) {

        me._debug('exit: delete all related redis keys=%s', list);
        me._connection.deleteKeys(list, function (err) {
          if (err) return callback(err);

          delKeysSuccess();
        });

      } else {
        delKeysSuccess();
      }

      function delKeysSuccess () {
        // 停止定时器
        me._debug('exit: clear timer');
        clearInterval(me._heartbeatTid);
      }
    });
  });

  // 处理调用请求
  this._setHandler('message.c', this._handleCallService);
}

utils.inheritsBase(CloudsServer);

/**
 * 注册服务
 *
 * @param {String} method
 * @param {Function} handle
 * @param {Function} callback
 */
CloudsServer.prototype.register = function (method, handle, callback) {
  this._debug('register: %s => %s', method, handle);

  this._services[method] = handle;
  this._resetServiceScore(method, callback);

  return this;
};

// 重新注册注册服务到Redis的可用服务器列表
CloudsServer.prototype._resetServiceScore = function (method, callback) {
  var key = this._key('S', method, this.id);
  this._debug('reset service score: %s, key=%s', method, key);

  this._connection.registerKey(key, this._heartbeat * 2, this._callback(callback));
};

// 保持服务在Redis的可用服务器列表
CloudsServer.prototype._keepServiceScore = function (method, callback) {
  var me = this;
  var key = this._key('S', method, this.id);
  me._debug('keep service score: %s, key=%s', method, key);

  me._connection.registerKey(key, this._heartbeat * 2, this._callback(callback));
};

// 心跳
CloudsServer.prototype._keepHeartbeat = function () {
  var me = this;
  me._debug('heartbeat');
  Object.keys(me._services).forEach(function (n) {
    me._keepServiceScore(n);
  });
};

// 处理服务调用请求
CloudsServer.prototype._handleCallService = function (msg) {
  var me = this;
  this._debug('handle call service: %s %s', msg.data.m, msg.data.a);

  var fn = me._services[msg.data.m];
  if (typeof fn !== 'function') {
    return me._responseResult(msg, new Error('service handler not found'));
  }

  fn.apply(null, msg.data.a.concat(function (err) {
    var args = Array.prototype.slice.call(arguments, 1);
    me._responseResult(msg, err, args);
  }));
};

// 返回结果
CloudsServer.prototype._responseResult = function (sourceMsg, err, args, callback) {
  var key = this._key(sourceMsg.sender);
  this._debug('response result: client=%s, key=%s, err=%s, args=%s', sourceMsg.sender, key, err, args);

  var msg = this._protocol.packResult(sourceMsg.data.i, err, args);

  this._connection.send(key, msg.raw, this._callback(callback));
};



module.exports = CloudsServer;
