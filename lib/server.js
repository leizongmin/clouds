/**
 * clouds server
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var utils = require('./utils');


/**
 * Clouds Server
 *
 * @param {Object} options
 *   - {Object} redis {host, port, db}
 */
function CloudsServer (options) {
  var me = this;
  var ns = this._ns = utils.createNamespace(options || {});
  var id = this._id = utils.uniqueId('server');
  var debug = this._debug = utils.debug('Server:' + id);
  this._prefix = ns('redis.prefix') || '';

  this._services = {};
  this._messages = {};

  // create redis connection
  this._cs = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));
  this._cp = utils.createRedisConnection(ns('redis.host'), ns('redis.port'), ns('redis.db'));

  this._listen();

  this._heartbeatTid = setInterval(function () {
    me._heartbeat();
  }, ns('heartbeat') * 1000);
}

utils.inheritsEventEmitter(CloudsServer);

CloudsServer.prototype._key = function () {
  var list = Array.prototype.slice.call(arguments);
  if (this._prefix) list.unshift(this._prefix);
  return list.join(':');
};

CloudsServer.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

CloudsServer.prototype._listen = function (callback) {
  var key = this._key('L', this._id);
  this._debug('start listen: key=%s', key);

  this._cs.subscribe(key, this._callback(callback));

  var me = this;
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
 * 注册服务
 *
 * @param {String} name
 * @param {Function} handle
 * @param {Function} callback
 */
CloudsServer.prototype.register = function (name, handle, callback) {
  this._debug('register: %s => %s', name, handle);

  this._services[name] = handle;
  this._resetServiceScore(name, callback);

  return this;
};

CloudsServer.prototype._resetServiceScore = function (name, callback) {
  var key = this._key('S', name, this._id);
  this._debug('reset service score: %s, key=%s', name, key);

  this._cp.setex(key, this._ns('heartbeat') * 2, 0, this._callback(callback));
};

CloudsServer.prototype._keepServiceScore = function (name, callback) {
  var me = this;
  var key = this._key('S', name, this._id);
  me._debug('keep service score: %s, key=%s', name, key);

  me._cp.get(key, function (err, ret) {
    if (err || !(ret > 0)) return me._resetServiceScore(name);

    me._cp.setex(key, this._ns('heartbeat') * 2, ret, this._callback(callback));
  });
};

CloudsServer.prototype._heartbeat = function () {
  var me = this;
  me._debug('heartbeat');
  Object.keys(me._services).forEach(function (n) {
    me._keepServiceScore(n);
  });
};

CloudsServer.prototype._handleMessage = function (msg) {
  this._debug('handle message: sender=%s, id=%s, err=%s, name=%s, args=%s', msg.sender, msg.id, msg.error, msg.name, msg.args);

  if (msg.type === 'call') {
    this._handleCallService(msg);
  } else {
    this._responseResult(msg, new Error('unknown message type'));
  }
};

CloudsServer.prototype._handleCallService = function (msg) {
  var me = this;
  this._debug('handle call service: %s %s', msg.name, msg.args);

  var fn = me._services[msg.name];
  if (typeof fn !== 'function') {
    return me._responseResult(msg, new Error('service handler not found'));
  }

  fn.apply(null, msg.args.concat(function (err) {
    var args = Array.prototype.slice.call(arguments, 1);
    me._responseResult(msg, err, args);
  }));
};

CloudsServer.prototype._responseResult = function (sourceMsg, err, args, callback) {
  var key = this._key('L', sourceMsg.sender);
  this._debug('response result: client=%s, key=%s, err=%s, args=%s', sourceMsg.sender, key, err, args);

  var msg = utils.pocketResultMessage(this._id, sourceMsg.id, err, args);

  this._cp.publish(key, msg.data, this._callback(callback));
};

CloudsServer.prototype.exit = function (callback) {
  var me = this;
  me._debug('exit');

  // 删除所有相关key
  var key = me._key('*' + me._id + '*');
  me._debug('exit: query all related redis keys=%s', key);
  me._cp.keys(key, function (err, list) {
    if (err) return callback(err);

    if (Array.isArray(list) && list.length > 0) {

      me._debug('exit: delete all related redis keys=%s', list);
      me._cp.del(list, function (err) {
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

      // 关闭redis连接
      me._debug('exit: close redis connection');
      me._cp.end();
      me._cs.end();

      me._callback(callback);
    }
  });
};

module.exports = CloudsServer;
