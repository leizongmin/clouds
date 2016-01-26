'use strict';

/**
 * clouds server
 *
 * @author 老雷<leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const define = require('./define');
const utils = require('./utils');
const Consumer = require('super-queue').Consumer;
const CloudsProtocol = require('./protocol');

let counter = 0;

class CloudsServer extends EventEmitter {

  /**
   * Clouds Server
   *
   * @param {Object} options
   *   - {Object} redis {host, port, db, prefix}
   *   - {Number} heartbeat (s)
   *   - {Number} capacity
   */
  constructor(options) {
    super();

    options = options || {};
    this._heartbeat = (options.heartbeat > 0 ? options.heartbeat : define.heartbeat);
    this._redis = options.redis || {};
    this._capacity = (options.capacity > 0 ? options.capacity : define.capacity);

    this._queues = new Map();
    this._protocol = new CloudsProtocol();
    this._services = new Map();

    this._debug = utils.debug('server:#' + (counter++));
    this._debug('created: redis=%j, timeout=%s', options.redis, options.timeout);
  }

  _getQueueByMethodName(method) {

    let queue = utils.getQueueFromMethodName(method);

    if (this._queues.has(queue)) {

      return this._queues.get(queue);

    } else {

      let c = new Consumer({
        queue: queue,
        redis: this._redis,
        capacity: this._capacity,
        heartbeat: this._heartbeat,
      });

      c.listen(msg => {
        this._newMsg(queue, msg);
      });

      this._queues.set(queue, c);
      return c;

    }

  }

  _newMsg(queue, msg) {

    this._debug('_newMsg: queue=%s, msg=%j', queue, msg);

    const d = this._protocol.unpack(msg.data).data;
    const method = d.m;
    const args = d.a;

    const self = this;
    const callback = function () {
      const args = Array.prototype.slice.call(arguments);
      const err = args.shift();
      self._debug('callback: err=%s, args=%j', err, args);
      msg.resolve(self._protocol.packResult(err, args).raw);
    };

    if (!this._services.has(method)) {
      return callback(new utils.NoAvailableServerError(`no available server for method "${method}"`));
    }

    const handle = this._services.get(method);
    args.push(callback);
    try {
      handle.apply(null, args)
    } catch (err) {
      callback(err);
    }

  }

  /**
   * 注册服务
   *
   * @param {String} method
   * @param {Function} handle
   * @param {Function} callback
   */
  register(method, handle, callback) {

    this._debug('register: %s => %s', method, handle);
    this._services.set(method, handle);

    this._getQueueByMethodName(method);

    if (callback) process.nextTick(callback);

    return this;
  }

  exit(callback) {

    const cb = (err) => {
      this._debug('exited: err=%s', err);
      callback && callback(err);
    };

    let queues = [];
    for (let n of this._queues.keys()) {
      queues.push(this._queues.get(n));
    }
    this._queues.clear();
    Promise.all([queues.map(q => q.exit())])
      .then(() => cb(null))
      .catch(err => cb(err));
  }

}

module.exports = CloudsServer;
