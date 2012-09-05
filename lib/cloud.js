'use strict';

/**
 * cloud
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var cloud = module.exports;
var Service = cloud.Service = require('./service');
var RemoteService = cloud.RemoteService = require('./remote-service');
var utils = cloud.utils = require('./utils');
var parser = cloud.parser = require('./parser');
var redis = require('redis');
var debug = require('debug')('cloud');


// 默认配置
var defaultConfig = {
  redis: {                    // Redis服务器配置
    host:   '127.0.0.1',
    port:   6379,
    db:     0,
    prefix: ''
  },
  service: {
    callbackTimeout:  60000,  // 等待回调超时
    concurrentCall:   100     // 服务默认可提供的同时调用次数
  }
};


/**
 * 连接到redis服务器
 *
 * @param {object} config
 */
cloud.connect = function (config) {
  config = config || {};
  config = utils.merge(defaultConfig, config);
  cloud._config = config;
  cloud._services = {};

  var pid = cloud.pid = utils.uniqueId();
  debug('connect: pid=' + pid);

  var createRedisConnection = function () {
    var client = redis.createClient(config.redis.port, config.redis.host);
    client.select(config.redis.db);
    client.on('error', parser.onError);
    return client;
  };

  cloud._redisKey = function (str) {
    return config.redis.prefix + str;
  };

  // 创建两个redis连接，一个用于发布、订阅消息，一个用于其他操作
  cloud._redis = createRedisConnection();
  cloud._redis2 = createRedisConnection();
  cloud._redis2.subscribe(cloud._redisKey('P:' + pid));
  cloud._redis2.on('message', parser.onMessage);
};

/**
 * 注册服务
 *
 * @param {string} name
 * @param {object} options
 * @param {function} callback
 */
cloud.register = function (name, options, callback) {
  debug('register ' + name);
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = utils.merge(defaultConfig.service, options);
  var service = new Service(options);
  parser.registerService(name, service, function (err) {
    if (err) return callback(err);

    cloud._services[name] = service;
    callback(null, service);
  });
};

/**
 * 注销服务
 *
 * @param {string} name
 * @param {function} callback
 */
cloud.unregister = function (name, callback) {
  debug('unregister ' + name);
  callback = callback || function () {};
  parser.unregisterService(name, function (err) {
    if (err) return callback(err);

    delete cloud._services[name];
    callback(null);
  });
};

/**
 * 返回指定服务器的调用
 *
 * @param {string} name
 * @param {object} options
 */
cloud.require = function (name, options) {
  debug('require ' + name);
  options = utils.merge(cloud._config.service, options);
  return new RemoteService(name, options);
};


/**
 * 断开连接
 */
cloud.disconnect = function () {
  debug('disconnect');
  if (cloud._services) {
    for (var s in cloud._services) {
      cloud.unregister(s);
    }
  }
};

// 程序退出时，自动注销各服务
process.on('exit', function () {
  debug('process exit');
  cloud.disconnect();
});
