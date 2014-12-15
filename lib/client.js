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

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = utils.uniqueId('client');
  var debug = this._debug = utils.debug('Client:' + id);

  this._timeout = options.timeout;
  this._prefix = ns('redis.prefix') || define.redisPrefix;
  this._serverMaxAge = ns('serverMaxAge') || define.serverMaxAge;

  this._messages = {};
  this._servers = {};
  this._serversTimestamp = {};

  // create redis connection
  this._cs = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));
  this._cp = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));

  this._autoClearServerList();

  this._listen();
}

utils.inheritsEventEmitter(CloudsClient);

// 获得redis key
CloudsClient.prototype._key = function () {
  var list = Array.prototype.slice.call(arguments);
  if (this._prefix) list.unshift(this._prefix);
  return list.join(':');
};

// 处理默认的回调函数
CloudsClient.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

// 开始监听消息
CloudsClient.prototype._listen = function (callback) {
  var me = this;
  var key = this._key('L', this.id);
  this._debug('start listen: key=%s', key);

  this._cs.on('subscribe', function (channel, count) {
    me._debug('subscribe succeed: channel=%s, count=%s', channel, count);
    me.emit('listen');
  });

  this._cs.on('message', function (channel, msg) {
    me._debug('receive message: channel=%s, msg=%s', channel, msg);

    if (channel !== key) {
      me._debug(' - message from unknown channel: channel=%s', channel);
      return;
    }

    me._handleMessage(utils.parseMessage(msg));
  });

  this._cs.subscribe(key, this._callback(callback));
};

// 自动清理本地的服务器列表
CloudsClient.prototype._autoClearServerList = function () {
  var me = this;
  me._clearServerListTid = setInterval(function () {
    me._debug('start clear server list');

    var t = Date.now() - me._serverMaxAge * 1000;
    Object.keys(me._servers).forEach(function (name) {

      if (me._serversTimestamp[name] <= t) {
        me._debug('clear server list: %s [%s]', name, me._servers[name].length);
        delete me._servers[name];
        delete me._serversTimestamp[name];
      }

    });

  }, me._serverMaxAge * 500);
};

/**
 * 设置
 *
 * @param {String} name
 * @param {Mixed} value
 */
CloudsClient.prototype.set = function (name, value) {
  this._debug('set: %s <= %s', name, value);

  name = name.toLowerCase().trim();
  if (name === 'find server') {
    this._debug('  provide new _findOneServer function');
    this._findOneServer = value;
  } else {
    this._debug('  unknown param name');
  }
};

/**
 * 调用服务
 *
 * @param {String} name
 * @param {Array} args
 * @param {Function} callback
 */
CloudsClient.prototype.call = function (name, args, callback) {
  var me = this;
  var msg = utils.pocketCallMessage(this.id, name, args);
  this._debug('call: %s => %s, args=%s', name, msg.id, args);

  // 寻找一个可用的服务器
  var serverId;
  me._findOneServer(name, function (err, ret) {
    if (err) return cb(err);

    serverId = ret;
    me._setMessageHandler(msg.id, cb);
    me._sendCallRequest(serverId, msg.data);
  });

  var hasCallback = false;

  // 保证只回调一次
  function cb () {
    me._debug('call [%s]: on callback => %s', name, callback);

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
    me._debug('call: callback on timeout, name=%s, args=%s', name, args);
    var err = new Error('timeout');
    err.code = 'CLOUDS_CALL_SERVICE_TIMEOUT';

    // 清楚消息处理程序
    me._removeMessageHandler(msg.id);

    // 清除当前服务器
    me._removeServer(serverId, name);

    return cb(err);
  }

  var tid = setTimeout(checkTimeout, me._timeout * 1000);

  return this;
};

/**
 * 返回一个调用指定服务的函数
 *
 * @param {String} name
 * @param {Number} retry
 * @param {Number} onRetry  格式：function (arg1, arg2, ... callback) { callback(arg1, arg2, ...); }
 * @return {Function}
 */
CloudsClient.prototype.bind = function (name, retry, onRetry) {
  var me = this;
  retry = Number(retry);
  if (!(retry > 0)) retry = 0;
  me._debug('bind: name=%s, retry=%s, onRetry=%s', name, retry, onRetry);

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
        me._debug('[bind]call [%s]: retry, counter=%s', name, retryCounter);
        start();
      }
    }

    function start () {
      me._debug('[bind]call [%s]: start, timeout=%s', timeout);
      onRetry.apply(null, args.concat(call));
    }

    function call () {
      var args = Array.prototype.slice.call(arguments);
      me.call(name, args, onCallback);
    }

    start();
  };
};

// 寻找一个指定服务可用的服务器列表
CloudsClient.prototype._findOneServer = function (name, callback) {
  var me = this;

  if (!Array.isArray(me._servers[name])) me._servers[name] = [];
  if (me._servers[name].length < 1) {

    var key = me._key('S', name, '*');
    me._cp.keys(key, function (err, list) {
      if (err) return callback(err);
      if (!Array.isArray(list)) list = [];

      list = list.map(function (item) {
        return item.split(':').pop();
      });

      me._saveServerList(name, list);
      returnOneServer();
    });

  } else {
    returnOneServer();
  }

  function returnOneServer () {

    var len = me._servers[name].length;
    if (len < 1) {
      var err = new Error('no available server');
      err.code = 'CLOUDS_NO_AVAILABLE_SERVER';
      return callback(err);
    }

    // 随机返回一个
    var i = parseInt(Math.random() * me._servers[name].length, 10);
    var id= me._servers[name][i];

    me._debug('find one server: serverId=%s, name=%s', id, name);
    return callback(null, id);
  }
};

CloudsClient.prototype._incrServiceScore = function (name, callback) {
  var key = this._key('S', name, this.id);
  this._debug('increase service score: %s, key=%s', name, key);

  this._cp.incr(key, this._callback(callback));
};

// 发送服务调用请求
CloudsClient.prototype._sendCallRequest = function (serverId, msg, callback) {
  var key = this._key('L', serverId);
  this._debug('send call request: server=%s, key=%s', serverId, key);

  this._cp.publish(key, msg, this._callback(callback));
};

// 处理收到的消息
CloudsClient.prototype._handleMessage = function (msg) {
  this._debug('handle message: sender=%s, id=%s, err=%s, args=%s', msg.sender, msg.id, msg.error, msg.args);

  if (msg.type === 'result') {
    this._handleCallResult(msg);
  } else if (msg.type === 'message') {
    this._handleSendMessage(msg);
  } else {
    this._debug('unknown message type: %s', msg.type);
  }
};

// 处理服务调用结果
CloudsClient.prototype._handleCallResult = function (msg) {
  var fn = this._getMessageHandler(msg.id);
  this._debug('handle call result: #%s %s => %s', msg.id, msg.args, fn);
  if (typeof fn !== 'function') {
    return this._debug('unknown message id: %s', msg.id);
  }

  this._removeMessageHandler(msg.id);

  fn.apply(null, [msg.error || null].concat(msg.args));
};

// 保存可用服务器列表
CloudsClient.prototype._saveServerList = function (name, list) {
  this._debug('save server list: [%s] <= %s', name, list);
  this._servers[name] = list || [];
  this._serversTimestamp[name] = Date.now();
};

// 将指定服务的服务器从可用列表中删除
CloudsClient.prototype._removeServer = function (serverId, name) {
  this._debug('remove server from local list: [%s] %s', serverId, name);

  if (this._servers[name] && this._servers[name].length > 0) {
    this._servers[name] = this._servers[name].filter(function (item) {
      return (item !== serverId);
    });
  }

  if (!this._ns('notAutoCleanRemoteServer')) {
    this._debug('remove server from remote list');
    this._cp.del(this._key('S', name, serverId), this._callback());
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

// 处理接收到的消息
CloudsClient.prototype._handleSendMessage = function (msg) {
  this._debug('on message: @%s => %s', msg.sender, msg.args);
  this.emit('message', msg.sender, msg.args);
};

/**
 * 发送消息
 *
 * @param {String} receiver
 * @param {Mixed} message
 * @param {Function} callback
 */
CloudsClient.prototype.send = function (receiver, message, callback) {
  this._debug('send: @%s => %s', receiver, message);

  var msg = utils.pocketSendMessage(this.id, message);
  this._sendMessage(receiver, msg);
};

CloudsClient.prototype._sendMessage = function (receiver, msg, callback) {
  var key = this._key('L', receiver);
  this._debug('send message: receiver=%s, key=%s', receiver, key);

  this._cp.publish(key, msg.data, this._callback(callback));
};

/**
 * 退出
 *
 * @param {Function} callback
 */
CloudsClient.prototype.exit = function (callback) {
  var me = this;
  me._debug('exit');

  clearInterval(me._clearServerListTid);

  // 关闭redis连接
  me._debug('exit: close redis connection');
  me._cp.end();
  me._cs.end();

  me._callback(callback);
};


module.exports = CloudsClient;
