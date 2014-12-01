'use strict';

var clouds = require('clouds');

clouds.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  },
  service: {
    callbackTimeout: 1000
  }
});

clouds.register('test2', function (err, service) {
  if (err) throw err;

  service.on('say', function (msg, callback) {
    console.log('on say: ' + msg);
    setTimeout(function () {
      callback(null, 'ok');
    }, 2000);
  });

  var test = clouds.require('test2');
  test.emit('say', 'first');
  test.emit('say', 'second', function (err, ret) {
    if (err) console.log(err.stack);
    console.log('emit say: ' + ret);
  });

  die(5000);
});


function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}