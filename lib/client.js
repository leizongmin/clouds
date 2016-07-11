'use strict';

/**
 * clouds client
 *
 * @author 老雷<leizongmin@gmail.com>
 */

const assert = require('assert');
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
   *   - {Number} timeoutChecker (if the value less than 1 disable local checker)
   *   - {Number} heartbeat (s)
   */
  constructor(options) {
    super();

    options = options || {};
    this._timeout = (options.timeout > 0 ? options.timeout : define.timeout);
    this._timeoutChecker = ('timeoutChecker' in options) ? options.timeoutChecker : define.timeoutChecker;
    this._heartbeat = (options.heartbeat > 0 ? options.heartbeat : define.heartbeat);
    this._redis = options.redis || {};

    this._timeout = Number(this._timeout);
    assert(!isNaN(this._timeout), `timeout must be a number`);

    this._timeoutChecker = Number(this._timeoutChecker);
    assert(!isNaN(this._timeoutChecker), `timeoutChecker must be a number`);

    this._heartbeat = Number(this._heartbeat);
    assert(!isNaN(this._heartbeat), `heartbeat must be a number`);

    this._queues = new Map();
    this._queuesEmitStart = {};
    this._protocol = new CloudsProtocol();

    this._debug = utils.debug('client:#' + (counter++));
    this._debug('created: redis=%j, timeout=%s', options.redis, options.timeout);
  }

  _getQueueByMethodName(method, callback) {

    let queue = utils.getQueueFromMethodName(method);

    if (this._queues.has(queue)) {

      callback && callback(null, this._queues.get(queue));

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

        callback && callback(null, p);
      });

      this._queues.set(queue, p);

    }

  }

  ready(callback) {

    this._debug('register ready handler');
    this.once('ready', callback);
    this._checkReady();

  }

  readyP() {
    return new Promise((resolve, reject) => {
      this.ready(resolve);
    });
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

    let cb = callback;
    let hasCallback = false;
    let timerId;
    if (this._timeoutChecker >= 1) {

      cb = function () {
        if (timerId) clearTimeout(timerId);
        if (hasCallback) return;
        hasCallback = true;
        callback.apply(null, arguments);
      };

      timerId = setTimeout(() => {
        cb(utils.newCallServiceTimeoutError(`call service "${method}" timeout`));
      }, this._timeout * this._timeoutChecker * 1000);

    }

    this._getQueueByMethodName(method, (err, p) => {
      if (err) return cb(err);

      p.push({
        data: msg.raw,
        maxAge: this._timeout,
      }, (err, ret) => {
        if (err) {
          if (err.code === 'msg_expired' || err.message === 'MessageProcessingTimeoutError') {
            return cb(utils.newCallServiceTimeoutError(`call service "${method}" timeout`));
          } else {
            return cb(err);
          }
        } else {
          const d = this._protocol.unpack(ret.result).data;
          const err = d.e;
          const result = d.r;
          this._debug('callback: err=%s, result=%j', err, result);
          if (err) {
            cb(err);
          } else {
            cb.apply(null, [null].concat(result));
          }
        }
      });
    });

  }

  callP(method, args) {
    return new Promise((resolve, reject) => {
      this.call(method, args, (err, ret) => {
        if (err) {
          reject(err);
        } else {
          resolve(ret);
        }
      });
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

  bindP(method) {
    const self = this;
    this._getQueueByMethodName(method);
    return function () {

      let args = Array.prototype.slice.call(arguments);
      if (typeof args[args.length - 1] === 'function') {
        callback = args.pop();
      }

      return self.callP(method, args);

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

  exitP() {
    return new Promise((resolve, reject) => {
      this.exit(resolve);
    });
  }

}

module.exports = CloudsClient;
