'use strict';

/**
 * cloud
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var debug = require('debug')('clouds:main');
var cloud = exports = module.exports = require('./lib/cloud');

cloud.version = require('./package.json').version;


/**
 * 使用Wind.js封装异步方法
 * 返回当前使用的wind.js对象
 *
 * @param {int} loggerLevel
 * @return {object}
 */
cloud.wind = function (loggerLevel) {
  if (cloud._wind) {
    if (isFinite(loggerLevel)) cloud._wind.logger.level = loggerLevel;
    return cloud._wind;
  }

  var Wind = require('wind');
  var bind = Wind.Async.Binding.fromStandard;
  
  loggerLevel = isFinite(loggerLevel) ? loggerLevel : Wind.Logging.Level.WARN;
  Wind.logger.level = loggerLevel;
  
  cloud.registerAsync = bind(cloud.register);
  cloud.unregisterAsync = bind(cloud.unregister);
  cloud.cleanAsync = bind(cloud.clean);
  cloud.heartbeatAsync = bind(cloud.heartbeat);
  
  var Service = cloud.Service.prototype;
  Service.relatedProcessAsync = bind(Service.relatedProcess);
  Service.heartbeatAsync = bind(Service.heartbeat);
  Service.getAsync = bind(Service.get);
  Service.setAsync = bind(Service.set);
  Service.removeAsync = bind(Service.remove);
  
  var RemoteService = cloud.RemoteService.prototype;
  RemoteService.emitAsync = bind(RemoteService.emit);
  RemoteService.pemitAsync = bind(RemoteService.pemit);
  RemoteService.relatedProcessAsync = bind(RemoteService.relatedProcess);
  RemoteService.setAsync = bind(RemoteService.set);
  RemoteService.getAsync = bind(RemoteService.get);
  RemoteService.removeAsync = bind(RemoteService.remove);
  
  cloud._wind = Wind;
  return Wind;
};
