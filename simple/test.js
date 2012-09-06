'use strict';

var clouds = require('clouds');

clouds.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  }
});

clouds.register('hello', function (err, service) {
  if (err) throw err;
  //console.log(service);
  //clouds.unregister('hello', function (err) {
  //  if (err) throw err;
  //  process.exit();
  //});
  
  service.on('say', function (msg, callback) {
    console.log('on say: ' + msg);
    callback(null, 'ok');
  });

  var hello = clouds.require('hello');
  hello.emit('say', 'first');
  hello.emit('say', 'second', function (err, ret) {
    if (err) console.log(err.stack);
    console.log('emit say: ' + ret);
  });
  
  die(1000);
});


function die (t) {
  setTimeout(function () {
    process.exit();
  }, t);
}