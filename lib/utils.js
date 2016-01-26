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

utils.getQueueFromMethodName = function (method) {
  const i = method.lastIndexOf('.');
  if (i === -1) {
    return 'global';
  } else {
    return method.slice(0, i);
  }
};

utils.NoAvailableServerError = utils.customError('NoAvailableServerError', {
  code: 'CLOUDS_NO_AVAILABLE_SERVER',
});

utils.CallServiceTimeoutError = utils.customError('CallServiceTimeoutError', {
  code: 'CLOUDS_CALL_SERVICE_TIMEOUT',
});
