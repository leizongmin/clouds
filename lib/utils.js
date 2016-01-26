/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */

const leiNS = require('lei-ns');
const createDebug = require('debug');
const define = require('./define');
const leiPromise = require('lei-promise');
module.exports = exports = utils = require('lei-utils').extend({});


exports.debug = function (n) {
  return createDebug('clouds:' + n);
};

const debug = exports.debug('utils');

utils.classMethodWrapPromise = function (obj, methods) {
  for (const method of methods) {
    obj.prototype['_' + method + 'Callback'] = obj.prototype[method];
    obj.prototype[method] = leiPromise.promisify(obj.prototype[method], null, true);
  }
};

utils.getQueueFromMethodName = function (method) {
  const i = method.lastIndexOf('.');
  if (i === -1) {
    return 'global';
  } else {
    return method.slice(0, i);
  }
};
