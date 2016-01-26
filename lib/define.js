/**
 * clouds
 *
 * @author 老雷<leizongmin@gmail.com>
 */

// 默认心跳周期，单位：秒
exports.heartbeat = 2;

// 默认调用超时，单位：秒
exports.timeout = 10;

// 默认onRetry函数
exports.onRetry = function () {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  callback.apply(null, args);
};

// 默认Redis连接地址
exports.redisHost = '127.0.0.1';
exports.redisPort = 6379;
exports.redisDb = 0;
exports.redisPrefix = 'clouds';

// 触发listen事件的延时时间，单位：毫秒
exports.emitListenDelay = 200;

// exit时关闭连接的延时时间，单位：毫秒
exports.exitConnectionDelay = 200;
