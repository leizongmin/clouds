/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */

const createDebug = require('debug');
const define = require('./define');
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

utils.NoAvailableServerError = utils.customError('NoAvailableServerError');
utils.newNoAvailableServerError = function (msg) {
  return new utils.NoAvailableServerError(msg, {
    code: 'CLOUDS_NO_AVAILABLE_SERVER',
  });
};

utils.CallServiceTimeoutError = utils.customError('CallServiceTimeoutError');
utils.newCallServiceTimeoutError = function (msg) {
  return new utils.CallServiceTimeoutError(msg, {
    code: 'CLOUDS_CALL_SERVICE_TIMEOUT',
  });
};
