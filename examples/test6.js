'use strict';

var clouds = require('clouds');

clouds.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  },
  service: {
    callbackTimeout:  1000
  }
});

clouds.register('test6', function (err, service) {
  if (err) throw err;

  service.on('say', function (msg, callback) {
    console.log(' on say: ' + msg);
    //callback(null);
  });

  var s = clouds.require('test6');

  for (var i = 0; i < 10; i++) {
    setTimeout(function () {
      s.emit('say', 'hello ' + i);
      //s.emit('say', 'hello ' + i, function () { });
    }, i * 1000)
  }
  die(20000);
});


function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}