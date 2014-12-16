/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */


exports.version = require('../package.json').version;

exports.Base = require('./base');

exports.Client = require('./client');

exports.Server = require('./server');

exports.Broker = require('./broker');

exports.createBase = function (options) {
  return new exports.Base(options);
};

exports.createClient = function (options) {
  return new exports.Client(options);
};

exports.createServer = function (options) {
  return new exports.Server(options);
};

exports.createBroker = function (options) {
  return new exports.Broker(options);
};
