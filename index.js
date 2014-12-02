'use strict';

/**
 * cloud
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var debug = require('debug')('clouds:main');
var cloud = exports = module.exports = require('./lib/cloud');

cloud.version = require('./package.json').version;
