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

clouds.register('test3', function (err, service) {
  if (err) throw err;
});


function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}


setTimeout(function () {
  clouds.clean(function () {
    die(500);
  });
  //die(2000);
}, 1000);