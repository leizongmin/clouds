'use strict';

var clouds = require('clouds');

clouds.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  }
});
console.log('PID=' + clouds.pid);

clouds.register('test1', function (err, service) {
  if (err) throw err;

  service.on('say', function (msg, callback) {
    console.log(clouds.pid + ' on say: ' + msg);
    setTimeout(function () {
      callback(null, 'ok');
    }, Math.random() * 2000);
  });
});
