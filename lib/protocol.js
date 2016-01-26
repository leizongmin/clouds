'use strict';

/**
 * clouds protocol
 *
 * @author 老雷<leizongmin@gmail.com>
 */

const define = require('./define');
const utils = require('./utils');


class CloudsProtocol {

  constructor(sender) {
    this.sender = sender;
    this._debug = utils.debug('protocol:' + sender);
    this._debug('create');
  }

  _toString(d) {
    return {
      params: d,
      raw: JSON.stringify(d)
    };
  }

  packMessage(content) {
    this._debug('packMessage: %s', content);
    return this._toString({
      t: 'm',
      s: this.sender,
      d: content
    });
  }

  packCall(method, args) {
    const messageId = utils.randomString(8);
    this._debug('packCall: %s, %s, %s', messageId, method, args);
    return this._toString({
      t: 'c',
      s: this.sender,
      d: {
        i: messageId,
        m: method,
        a: args
      }
    });
  }

  packResult(messageId, err, result) {
    this._debug('packResult: %s, %s', messageId, result);
    return this._toString({
      t: 'r',
      s: this.sender,
      d: {
        i: messageId,
        e: this._packErrorMessage(err || null),
        r: result
      }
    });
  }

  unpack(str) {
    this._debug('unpack: %s', str);
    const data = JSON.parse(str);

    if (data.t === 'r' && data.d.e) {
      data.d.e = this._unpackErrorMessage(data.d.e);
    }

    const ret = {
      type: data.t,
      sender: data.s,
      data: data.d,
      raw: str
    };

    return ret;
  }

  _unpackErrorMessage(e) {
    // 出错信息
    const err = new Error(e.message);
    err.originStack = e.originStack;
    Object.keys(e).forEach(function (k) {
      err[k] = e[k];
    });
    return err;
  }

  _packErrorMessage(err) {
    if (!err) return err;
    let e = {};
    e.message = err.message;
    e.originStack = err.stack || new Error().stack;
    try {
      Object.keys(err).forEach(function (k) {
        e[k] = err[k];
      });
    } catch (err) {
      this._debug('_packErrorMessage: %s', err);
    }
    return e;
  }

}

module.exports = CloudsProtocol;
