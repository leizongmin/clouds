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
 *   - {Object} redis {host, port, db}
 */
function CloudsClient (options) {
  options = options || {};
  if (!(options.timeout > 0)) options.timeout = define.timeout;

  var ns = this._ns = utils.createNamespace(options);
  var id = this._id = utils.uniqueId('client');
  var debug = this._debug = utils.debug('Client:' + id);

  this._timeout = options.timeout;
  this._prefix = ns('redis.prefix') || define.redisPrefix;

  this._messages = {};
  this._servers = {};

  // create redis connection
  this._cs = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));
  this._cp = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));

  this._listen();
}

utils.inheritsEventEmitter(CloudsClient);

CloudsClient.prototype._key = function () {
  var list = Array.prototype.slice.call(arguments);
  if (this._prefix) list.unshift(this._prefix);
  return list.join(':');
};

CloudsClient.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

CloudsClient.prototype._listen = function (callback) {
  var me = this;
  var key = this._key('L', this._id);
  this._debug('start listen: key=%s', key);

  this._cs.subscribe(key, this._callback(callback));
  this._cs.on('subscribe', function (channel, count) {
    me._debug('subscribe succeed: channel=%s, count=%s', channel, count);
  });

  this._cs.on('message', function (channel, msg) {
    me._debug('receive message: channel=%s, msg=%s', channel, msg);

    if (channel !== key) {
      me._debug(' - message from unknown channel: channel=%s', channel);
      return;
    }

    me._handleMessage(utils.parseMessage(msg));
  });
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
  var msg = utils.pocketCallMessage(this._id, name, args);
  this._debug('call: %s => %s', name, msg.id);

  // 寻找一个可用的服务器
  me._findOneServer(name, function (err, serverId) {
    if (err) return cb(err);

    me._messages[msg.id] = cb;
    me._sendCallRequest(serverId, msg.data);
  });

  var hasCallback = false;

  // 保证只回调一次
  function cb () {
    me._debug('call [%s]: on callback', name);

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
    me._debug('callback: timeout, name=%s, args=%s', name, args);
    var err = new Error('timeout');
    err.code = 'CLOUDS_CALL_SERVICE_TIMEOUT';
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
 * @param {Number} onRetry
 * @return {Function}
 */
CloudsClient.prototype.bind = function (name, retry, onRetry) {
  var me = this;
  retry = Number(retry);
  if (!(retry > 0)) retry = 0;
  me._debug('bind: name=%s, retry=%s, onRetry=%s', name, retry, onRetry);

  var timeout = me._timeout * 1000;
  if (!(timeout > 0)) timeout = 0;

  return function () {

    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    if (typeof callback !== 'function') {
      throw new Error('must provide a callback function');
    }

    if (typeof onRetry !== 'function') {
      onRetry = function () {
        me._debug('[bind]call [%s]: default on retry, args=%s', name, args);
        me.call(name, args, onCallback);
      };
    }

    var retryCounter = 0;

    function onCallback (err) {
      if (err && err.code === 'CLOUDS_CALL_SERVICE_TIMEOUT' && retryCounter < retry) {
        retryCounter++;
        me._debug('[bind]call [%s]: retry, count=%s', name, retryCounter);
        return start();
      }
      callback.apply(null, arguments);
    }

    function start () {
      me._debug('[bind]call [%s]: start, timeout=%s', timeout);
      onRetry.apply(null, args);
    }

    start();
  };
};

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

      me._servers[name] = list;
      returnOneServer();
    });

  } else {
    returnOneServer();
  }

  function returnOneServer () {

    var len = me._servers[name].length;
    if (len < 1) return callback(new Error('no available server'));

    // 随机返回一个
    var i = parseInt(Math.random() * me._servers[name].length, 10);
    var id= me._servers[name][i];

    me._debug('find one server: serverId=%s, name=%s', id, name);
    return callback(null, id);
  }
};

CloudsClient.prototype._incrServiceScore = function (name, callback) {
  var key = this._key('S', name, this._id);
  this._debug('increase service score: %s, key=%s', name, key);

  this._cp.incr(key, this._callback(callback));
};

CloudsClient.prototype._sendCallRequest = function (serverId, msg, callback) {
  var key = this._key('L', serverId);
  this._debug('send call request: server=%s, key=%s', serverId, key);

  this._cp.publish(key, msg, this._callback(callback));
};

CloudsClient.prototype._handleMessage = function (msg) {
  this._debug('handle message: sender=%s, id=%s, err=%s, args=%s', msg.sender, msg.id, msg.error, msg.args);

  if (msg.type === 'result') {
    this._handleCallResult(msg);
  } else {
    this._debug('unknown message type: %s', msg.type);
  }
};

CloudsClient.prototype._handleCallResult = function (msg) {
  var me = this;
  me._debug('handle call result: #%s %s', msg.id, msg.args);

  var fn = me._messages[msg.id];
  if (typeof fn !== 'function') {
    return me._debug('unknown message id: %s', msg.id);
  }
  delete me._messages[msg.id];

  fn.apply(null, [msg.error || null].concat(msg.args));
};

CloudsClient.prototype.exit = function (callback) {
  var me = this;
  me._debug('exit');

  // 关闭redis连接
  me._debug('exit: close redis connection');
  me._cp.end();
  me._cs.end();

  me._callback(callback);
};


module.exports = CloudsClient;
