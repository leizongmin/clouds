'use strict';

/**
 * cloud.utils
 *
 * Service对象
 */

var crypto = require('crypto');
var utils = module.exports;


/**
 * 32位MD5加密
 *
 * @param {string} text 文本
 * @return {string}
 */
utils.md5 = function (text) {
  return crypto.createHash('md5').update(text).digest('hex');
};

/**
 * 取唯一ID（10字符）
 *
 * @param {int} length
 * @return {string}
 */
utils.uniqueId = function (length) {
  length = length || 10;
  return utils.md5(Math.random() + '').substr(0, length).toUpperCase();
};

/**
 * 合并多个对象
 *
 * @param {object} a
 * @param {object} b
 * @return {object}
 */
utils.merge = function () {
  var ret = {};
  for (var i in arguments) {
    var m = arguments[i];
    for (var j in m) ret[j] = m[j];
  }
  return ret;
};
