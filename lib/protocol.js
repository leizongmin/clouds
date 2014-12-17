/**
 * clouds protocol
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


function CloudsProtocol (sender) {
  this.sender = sender;
  this._debug = utils.debug('protocol:' + sender);
  this._debug('create');
}

CloudsProtocol.prototype._toString = function (d) {
  return {
    params: d,
    raw: JSON.stringify(d)
  };
};

CloudsProtocol.prototype.packMessage = function (content) {
  this._debug('packMessage: %s', content);
  return this._toString({
    t: 'm',
    s: this.sender,
    d: content
  });
};

CloudsProtocol.prototype.packCall = function (method, args) {
  var messageId = utils.randomString(8);
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
};

CloudsProtocol.prototype.packResult = function (messageId, err, result) {
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
};

CloudsProtocol.prototype.unpack = function (str) {
  this._debug('unpack: %s', str);
  var data = JSON.parse(str);

  if (data.t === 'r' && data.d.e) {
    data.d.e = this._unpackErrorMessage(data.d.e);
  }

  var ret = {
    type: data.t,
    sender: data.s,
    data: data.d,
    raw: str
  };

  return ret;
};

CloudsProtocol.prototype._unpackErrorMessage = function (e) {
  // 出错信息
  var err = new Error(e.message);
  Object.keys(e).forEach(function (k) {
    err[k] = e[k];
  });
  return err;
};

CloudsProtocol.prototype._packErrorMessage = function (err) {
  if (!err) return err;
  var e = {};
  e.message = err.message;
  try {
    Object.keys(err).forEach(function (k) {
      e[k] = err[k];
    });
  } catch (err) {
    this._debug('_packErrorMessage: %s', err);
  }
  return e;
};


module.exports = CloudsProtocol;
