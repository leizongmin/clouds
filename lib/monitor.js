/**
 * clouds monitor
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


/**
 * Clouds Server
 *
 * @param {Object} options
 *   - {Object} redis {host, port, db, prefix}
 */
function CloudsMonitor (options) {
  options = options || {};

  // 初始化CloudsBase
  options.type = 'monitor';
  CloudsMonitor.super_.call(this, options);

  // 处理调用请求
  this._setHandler('message.c', this._handleCallService);
}

utils.inheritsBase(CloudsMonitor);

/**
 * 查询状态
 *
 * @param {Function} callback
 */
CloudsMonitor.prototype.status = function (callback) {
  var me = this;
  var key = me._key('S', '*');
  me._connection.keys(key, function (err, list) {
    if (err) return callback(err);
    var servers = {};
    var methods = {};
    list.forEach(function (k) {
      var b = k.split(':').slice(1);
      var m = b[0];
      var i = b[1];
      if (!servers[i]) servers[i] = [];
      servers[i].push(m);
      if (!methods[m]) methods[m] = [];
      methods[m].push(i);
    });
    callback(null, {
      servers: servers,
      methods: methods
    });
  });
};



module.exports = CloudsMonitor;
