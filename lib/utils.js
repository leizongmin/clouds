/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var debug = require('debug');
module.exports = exports = require('lei-utils');

exports.debug = function (n) {
  return debug('clouds:' + n);
};
