/**
 * clouds connection
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


/**
 * Clouds Connection
 *
 * @param {Object} options
 *   - {String} id
 *   - {Object} redis {host, port, db, prefix, password|auth_pass}
 */
function Connection (options) {
  options = options || {};

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = options.id;
  var debug = this._debug = utils.debug('connection:' + id);

  this._prefix = ns('redis.prefix') || define.redisPrefix;

  // create redis connection
  this._redisConnections = {};
  this._redisConnections.subscribe = utils.createRedisConnection(ns('redis'));
  this._redisConnections.publish = utils.createRedisConnection(ns('redis'));

  this._listen();
}

utils.inheritsEventEmitter(Connection);

// 获得redis key
Connection.prototype._key = function (key) {
  var list = Array.prototype.slice.call(arguments);
  if (this._prefix) list.unshift(this._prefix);
  return list.join(':');
};

// 去掉redis key prefix
Connection.prototype._stripPrefix = function (key) {
  if (key.slice(0, this._prefix.length + 1) === this._prefix + ':') {
    return key.slice(this._prefix.length + 1);
  } else {
    return key;
  }
};

// 处理默认的回调函数
Connection.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

// 取redis客户端
Connection.prototype._redis = function (name) {
  return this._redisConnections[name];
};

// 开始监听消息
Connection.prototype._listen = function (callback) {
  var me = this;
  var key = this._key('L', this.id);
  this._debug('start listen: key=%s', key);

  this._redis('subscribe').on('message', function (channel, msg) {
    me._debug('receive message: channel=%s, msg=%s', channel, msg);

    if (channel !== key) {
      me._debug(' - message from unknown channel: channel=%s', channel);
      return;
    }

    me._debug('emit message: %s', msg);
    me.emit('message', msg);
  });

  this._redis('subscribe').subscribe(key, function (err, count) {
    if (!err) {
      me._debug('subscribe succeed: channel=%s, count=%s', key, count);
      setTimeout(function () {
        me._debug('emit event: listen');
        me.emit('listen');
      }, define.emitListenDelay);
    }
    if (callback) callback(err, count);
  });
};

/**
 * 发送消息
 *
 * @param {String} receiver
 * @param {String} data
 * @param {Function} callback
 */
Connection.prototype.send = function (receiver, data, callback) {
  var key = this._key('L', receiver);
  this._debug('send: receiver=%s, key=%s', receiver, key);
  this._redis('publish').publish(key, data, this._callback(callback));
};

/**
 * 注册一个Key
 *
 * @param {String} key
 * @param {Number} ttl
 * @param {Function} callback
 */
Connection.prototype.registerKey = function (key, ttl, callback) {
  var newKey = this._key(key);
  this._debug('registerKey: key=%s, newKey=%s, ttl=%s', key, newKey, ttl);
  this._redis('publish').setex(newKey, ttl, 1, function (err) {
    callback(err, key);
  });
};

/**
 * 删除一个Key
 *
 * @param {String} key
 * @param {Function} callback
 */
Connection.prototype.deleteKey = function (key, callback) {
  var newKey = this._key(key);
  this._debug('deleteKey: key=%s, newKey=%s', key, newKey);
  this._redis('publish').del(newKey, function (err) {
    callback(err, key);
  });
};

/**
 * 删除一组Key
 *
 * @param {Array} keys
 * @param {Function} callback
 */
Connection.prototype.deleteKeys = function (keys, callback) {
  var me = this;
  this._debug('deleteKeys: keys=%s', keys);
  var op = this._redis('publish').multi();
  keys.forEach(function (key) {
    op.del(me._key(key));
  });
  op.exec(function (err) {
    callback(err, keys);
  });
};

/**
 * 列出符合要求的key
 *
 * @param {String} pattern
 * @param {Function} callback
 */
Connection.prototype.keys = function (pattern, callback) {
  var me = this;
  var newKey = this._key(pattern);
  this._debug('keys: pattern=%s, newKey=%s', pattern, newKey);
  this._redis('publish').keys(newKey, function (err, keys) {
    if (keys) {
      keys = keys.map(function (k) {
        return me._stripPrefix(k);
      });
    }
    callback(err, keys);
  });
};

/**
 * 退出
 *
 * @param {Function} callback
 */
Connection.prototype.exit = function (callback) {
  this._debug('exit');

  // 关闭redis连接
  this._debug('exit: close redis connection');
  this._redis('publish').end();
  this._redis('subscribe').end();

  // 触发exit事件
  this.emit('exit', this);

  if (callback) callback();
};


module.exports = Connection;
