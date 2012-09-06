'use strict';

var cloud = require('cloud');

cloud.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  },
  service: {
    callbackTimeout:  1000
  }
});

cloud.register('test5', function (err, service) {
  if (err) throw err;

  var callCount = 0;
  service.on('say', function (msg, callback) {
    console.log('try ' + callCount + ' on say: ' + msg);
    callCount++;
    if (callCount > 2) {
      callback(null, 'ok');
    }
  });

  var s = cloud.require('test5');
  
  s.pemit(-1, 'say', 'second', function (err, ret) {
    if (err) console.log(err.stack);
    console.log('emit say: ' + ret);
    die(500);
  });
  
});


function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}