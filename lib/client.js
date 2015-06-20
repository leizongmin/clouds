/**
 * clouds client
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


/**
 * Clouds Client
 *
 * @param {Object} options
 *   - {Object} redis {host, port, db, prefix}
 *   - {Number} timeout (s)
 *   - {Boolean} notAutoCleanRemoteServer
 *   - {Number} serverMaxAge
 */
function CloudsClient (options) {
  options = options || {};
  if (!(options.timeout > 0)) options.timeout = define.timeout;
  if (!(options.serverMaxAge > 0)) options.serverMaxAge = define.serverMaxAge;

  // 初始化CloudsBase
  options.type = 'client';
  CloudsClient.super_.call(this, options);

  this._timeout = options.timeout;
  this._serverMaxAge = this._ns('serverMaxAge') || define.serverMaxAge;

  this._messages = {};
  this._servers = {};
  this._serversTimestamp = {};
  this._findOneServerLastIndex = 0;

  this._autoClearServerList();

  // 处理调用结果
  this._setHandler('message.r', this._handleResult);
  // 清理本地服务器列表
  this._setHandler('clear_server_list', this._handleClearServerList);
  // 删除本地服务器缓存
  this._setHandler('remove_server', this._handleRemoveServer);
  // 保存服务器列表到缓存
  this._setHandler('save_server_list', this._handleSaveServerList);
  // 查找一个可用的服务器
  this._setHandler('find_one_server', this._handleFindOneServer);
}

utils.inheritsBase(CloudsClient);

// 自动清理本地的服务器列表
CloudsClient.prototype._autoClearServerList = function () {
  var me = this;
  me._clearServerListTid = setInterval(function () {
    me._debug('start clear server list');
    me._getHandler('clear_server_list').call(me);
  }, me._serverMaxAge * 500);
};

// 清理本地的服务器列表
CloudsClient.prototype._handleClearServerList = function () {
  var me = this;
  var t = Date.now() - me._serverMaxAge * 1000;
  Object.keys(me._servers).forEach(function (method) {
    if (me._serversTimestamp[method] <= t) {
      me._debug('clear server list: %s [%s]', method, me._servers[method].length);
      delete me._servers[method];
      delete me._serversTimestamp[method];
    }
  });
};

/**
 * 调用服务
 *
 * @param {String} method
 * @param {Array} args
 * @param {Function} callback
 */
CloudsClient.prototype.call = function (method, args, callback) {
  var me = this;
  var msg = me._protocol.packCall(method, args);
  var messageId = msg.params.d.i;
  this._debug('call: %s => %s, args=%s', method, messageId, args);

  // 寻找一个可用的服务器
  var serverId;
  me._findOneServer(method, function (err, ret) {
    if (err) return cb(err);

    serverId = ret;
    me._setMessageHandler(messageId, cb);
    me._sendCallRequest(serverId, msg.raw);
  });

  var hasCallback = false;

  // 保证只回调一次
  function cb () {
    me._debug('call [%s]: on callback => %s', method, callback);

    if (hasCallback) {
      me._debug('call [%s]: has callback');
      return;
    }

    hasCallback = true;
    clearTimeout(tid);
    callback.apply(null, arguments);
  }

  // 检查是否调用超时
  function checkTimeout () {
    me._debug('call: callback on timeout, method=%s, args=%s', method, args);
    var err = new Error('timeout');
    err.code = 'CLOUDS_CALL_SERVICE_TIMEOUT';

    // 清除消息处理程序
    me._removeMessageHandler(messageId);

    // 清除当前服务器
    me._removeServer(serverId, method);

    return cb(err);
  }

  var tid = setTimeout(checkTimeout, me._timeout * 1000);

  return this;
};

/**
 * 返回一个调用指定服务的函数
 *
 * @param {String} method
 * @param {Number} retry
 * @param {Number} onRetry  格式：function (arg1, arg2, ... callback) { callback(arg1, arg2, ...); }
 * @return {Function}
 */
CloudsClient.prototype.bind = function (method, retry, onRetry) {
  var me = this;
  retry = Number(retry);
  if (!(retry > 0)) retry = 0;
  me._debug('bind: method=%s, retry=%s, onRetry=%s', method, retry, onRetry);

  var timeout = me._timeout * 1000;
  if (!(timeout > 0)) timeout = 0;

  if (typeof onRetry !== 'function') {
    onRetry = define.onRetry;
  }

  return function () {

    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    if (typeof callback !== 'function') {
      throw new Error('must provide a callback function');
    }

    var retryCounter = 0;

    function onCallback (err) {
      if (err && retryCounter < retry) {
        if (err.code === 'CLOUDS_CALL_SERVICE_TIMEOUT') {
          return tryAgain();
        }
        if (err.code === 'CLOUDS_NO_AVAILABLE_SERVER') {
          return setTimeout(tryAgain, timeout);
        }
      }
      callback.apply(null, arguments);

      function tryAgain () {
        retryCounter++;
        me._debug('[bind]call [%s]: retry, counter=%s', method, retryCounter);
        start();
      }
    }

    function start () {
      me._debug('[bind]call [%s]: start, timeout=%s', timeout);
      onRetry.apply(null, args.concat(call));
    }

    function call () {
      var args = Array.prototype.slice.call(arguments);
      me.call(method, args, onCallback);
    }

    start();
  };
};

// 寻找一个指定服务可用的服务器ID
CloudsClient.prototype._findOneServer = function (method, callback) {
  this._debug('find one server: %s', method);
  this._getHandler('find_one_server').call(this, method, callback);
};

CloudsClient.prototype._handleFindOneServer = function (method, callback) {
  var me = this;

  if (!Array.isArray(me._servers[method])) me._servers[method] = [];
  if (me._servers[method].length < 1) {

    var key = me._key('S', method, '*');
    me._connection.keys(key, function (err, list) {
      if (err) return callback(err);
      if (!Array.isArray(list)) list = [];

      list = list.map(function (item) {
        // 取得key中的id
        return item.split(':').pop();
      });

      me._saveServerList(method, list);
      returnOneServer();
    });

  } else {
    returnOneServer();
  }

  function returnOneServer () {

    var len = me._servers[method].length;
    if (len < 1) {
      var err = new Error('no available server');
      err.code = 'CLOUDS_NO_AVAILABLE_SERVER';
      return callback(err);
    }

    // 依次取其中一个服务器的ID
    if (me._findOneServerLastIndex >= me._servers[method].length) {
      me._findOneServerLastIndex = 0;
    }
    var i = me._findOneServerLastIndex;
    var id= me._servers[method][i];
    me._findOneServerLastIndex++;

    me._debug('find one server: serverId=%s, method=%s', id, method);
    return callback(null, id);
  }
};

// 发送服务调用请求
CloudsClient.prototype._sendCallRequest = function (serverId, msg, callback) {
  var key = this._key(serverId);
  this._debug('send call request: server=%s, key=%s', serverId, key);

  this._connection.send(key, msg, this._callback(callback));
};

// 保存可用服务器列表
CloudsClient.prototype._saveServerList = function (method, list) {
  this._debug('save server list: [%s] <= %s', method, list);
  this._getHandler('save_server_list').call(this, method, list);
};

CloudsClient.prototype._handleSaveServerList = function (method, list) {
  this._servers[method] = list || [];
  this._serversTimestamp[method] = Date.now();
};

// 将指定服务的服务器从可用列表中删除
CloudsClient.prototype._removeServer = function (serverId, method) {
  this._debug('remove server from local list: [%s] %s', serverId, method);
  this._getHandler('remove_server').call(this, serverId, method);
};

CloudsClient.prototype._handleRemoveServer = function (serverId, method) {
  if (this._servers[method] && this._servers[method].length > 0) {
    this._servers[method] = this._servers[method].filter(function (item) {
      return (item !== serverId);
    });
  }

  if (!this._ns('notAutoCleanRemoteServer')) {
    this._debug('remove server from remote list');
    this._connection.deleteKey(this._key('S', method, serverId), this._callback());
  }
};

// 设置指定消息ID的处理程序
CloudsClient.prototype._setMessageHandler = function (id, handler) {
  this._debug('set message handler: %s => %s', id, handler);
  this._messages[id] = handler;
};

// 取指定消息ID的处理程序
CloudsClient.prototype._getMessageHandler = function (id) {
  var fn = this._messages[id];
  this._debug('get message handler: %s <= %s', id, fn);
  return fn;
};

// 删除指定消息ID的处理程序
CloudsClient.prototype._removeMessageHandler = function (id) {
  this._debug('remove message handler: id=%s', id);
  delete this._messages[id];
};

// 处理调用结果
CloudsClient.prototype._handleResult = function (msg) {
  var fn = this._getMessageHandler(msg.data.i);
  this._debug('handle call result: #%s %s => %s', msg.data.i, msg.data.r, fn);
  if (typeof fn !== 'function') {
    return this._debug('unknown message id: %s', msg.data.i);
  }

  this._removeMessageHandler(msg.data.i);

  fn.apply(null, [msg.data.e || null].concat(msg.data.r));
};


module.exports = CloudsClient;
