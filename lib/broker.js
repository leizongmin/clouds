/**
 * clouds broker
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');
var Client = require('./client');
var Server = require('./server');


/**
 * Clouds Broker
 *
 * @param {Object} options
 *   - {Object} redis {host, port, db, prefix}
 */
function CloudsBroker (options) {
  options = options || {};

  // 初始化CloudsBase
  options.type = 'broker';
  options.id = 'broker';
  CloudsBroker.super_.call(this, options);

}

utils.inheritsBase(CloudsBroker);



/**
 * 扩展客户端，使其支持Broker
 *
 * @param {Object} c Server或Client实例
 */
CloudsBroker.extend = function (c) {
  if (c instanceof Client) return CloudsBroker.extendClient(c);
  if (c instanceof Server) return CloudsBroker.extendServer(c);
  throw new Error('unknown client type');
};

CloudsBroker.extendClient = function (c) {

};

CloudsBroker.extendServer = function (s) {

};


module.exports = CloudsBroker;
