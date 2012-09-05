'use strict';

var cloud = require('cloud');

cloud.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  }
});
console.log('PID=' + cloud.pid);

cloud.register('test1', function (err, service) {
  if (err) throw err;

  service.on('say', function (msg, callback) {
    console.log(cloud.pid + ' on say: ' + msg);
    setTimeout(function () {
      callback(null, 'ok');
    }, Math.random() * 2000);
  });
});
