/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */


exports.version = require('../package.json').version;

exports.Client = require('./client');
//exports.Server = require('./server');
exports.Protocol = require('./protocol');

exports.createClient = function (options) {
  return new exports.Client(options);
};

exports.createServer = function (options) {
  return new exports.Server(options);
};

exports.createProtocol = function (options) {
  return new exports.Protocol(options);
};
