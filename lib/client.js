'use strict';

/**
 * clouds client
 *
 * @author 老雷<leizongmin@gmail.com>
 */

const EventEmitter = require('events').EventEmitter;
const define = require('./define');
const utils = require('./utils');
const Producer = require('super-queue').Producer;
const CloudsProtocol = require('./protocol');

let counter = 0;

class CloudsClient extends EventEmitter {

  /**
   * Clouds Client
   *
   * @param {Object} options
   *   - {Object} redis {host, port, db, prefix}
   *   - {Number} timeout (s)
   *   - {Number} heartbeat (s)
   */
  constructor(options) {
    super();

    options = options || {};
    this._timeout = (options.timeout > 0 ? options.timeout : define.timeout);
    this._heartbeat = (options.heartbeat > 0 ? options.heartbeat : define.heartbeat);
    this._redis = options.redis || {};

    this._queues = new Map();
    this._queuesEmitStart = {};
    this._protocol = new CloudsProtocol();

    this._debug = utils.debug('client:#' + (counter++));
    this._debug('created: redis=%j, timeout=%s', options.redis, options.timeout);
  }

  _getQueueByMethodName(method) {

    let queue = utils.getQueueFromMethodName(method);

    if (this._queues.has(queue)) {

      return this._queues.get(queue);

    } else {

      let p = new Producer({
        queue: queue,
        redis: this._redis,
        maxAge: this._timeout,
        heartbeat: this._heartbeat,
      });

      this._queuesEmitStart[queue] = false;
      p.once('start', () => {
        this._queuesEmitStart[queue] = true;
        this._checkReady();
      });

      this._queues.set(queue, p);
      return p;

    }

  }

  ready(callback) {

    this._debug('register ready handler');
    this.once('ready', callback);
    this._checkReady();

  }

  _checkReady() {

    let allReady = true;
    let queueCount = 0;
    for (let i in this._queuesEmitStart) {
      queueCount++;
      allReady = allReady && this._queuesEmitStart[i];
    }

    if (allReady && queueCount > 0) {
      this._debug('emit ready: queues=%s', queueCount);
      this.emit('ready');
    }

  }

  /**
   * 调用服务
   *
   * @param {String} method
   * @param {Array} args
   * @param {Function} callback
   */
  call(method, args, callback) {

    const msg = this._protocol.packCall(method, args);
    this._debug('call: %s, args=%s', method, args);

    const p = this._getQueueByMethodName(method);
    p.push({
      data: msg.raw,
      maxAge: this._timeout,
    }, (err, ret) => {
      if (err) {
        if (err.code === 'msg_expired') {
          return callback(new utils.CallServiceTimeoutError(`call service "${method}" timeout`));
        } else {
          return callback(err);
        }
      } else {
        const d = this._protocol.unpack(ret.result).data;
        const err = d.e;
        const result = d.r;
        this._debug('callback: err=%s, result=%j', err, result);
        if (err) {
          callback(err);
        } else {
          callback.apply(null, [null].concat(result));
        }
      }
    });

  }

  /**
   * 返回一个调用指定服务的函数
   *
   * @param {String} method
   * @return {Function}
   */
  bind(method) {
    const self = this;
    this._getQueueByMethodName(method);
    return function () {

      let args = Array.prototype.slice.call(arguments);
      let callback = null;
      if (typeof args[args.length - 1] === 'function') {
        callback = args.pop();
      }

      return self.call(method, args, callback);

    };
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

module.exports = CloudsClient;
