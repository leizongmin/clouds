'use strict';

var cloud = require('cloud');

cloud.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  },
  service: {
    callbackTimeout: 1000
  }
});

cloud.register('test3', function (err, service) {
  if (err) throw err;
});


function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}


setTimeout(function () {
  cloud.clean(function () {
    die(500);
  });
  //die(2000);
}, 1000);