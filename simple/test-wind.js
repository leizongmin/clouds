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

function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}

var Wind = clouds.wind();
console.log(clouds.wind());

var mainAsync = eval(Wind.compile('async', function () {

  var service = $await(clouds.registerAsync('wind'));
  console.log(service);

  service.on('say', function (msg, n, callback) {
    for (var i = 0; i < n; i++) {
      console.log((i + 1) + ': ' + msg);
    }
    return callback(null, n);
  });

  var remoteService = clouds.require('wind');

  var x = $await(remoteService.pemitAsync(-1, 'say', 'hello, Wind.js!', 5));
  console.log(x);

  die(1000);

}));
mainAsync().start();
