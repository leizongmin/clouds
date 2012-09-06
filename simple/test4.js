'use strict';

var cloud = require('cloud');
var success = require('debug')(' ok ');
var fail = require('debug')('fail');

cloud.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  },
  service: {
    callbackTimeout: 5000
  }
});
console.log('PID=' + cloud.pid);

var s = cloud.require('test4');

var i = 1;

var call = function () {
  s.emit('say', 'call ' + (i++) + ' times', function (err, ret) {
    if (err) {
      fail(err.toString());
    } else {
      success('callback: ' + ret);
    }
  });
  setTimeout(call, Math.random() * 1000);
};

call();

