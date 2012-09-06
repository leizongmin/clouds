'use strict';

var clouds = require('clouds');

clouds.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  }
});
console.log('PID=' + clouds.pid);

var s = clouds.require('test1');

var i = 1;

var call = function () {
  s.emit('say', 'call ' + (i++) + ' times', function (err, ret) {
    if (err) console.log(err.stack);
    console.log('callback: ' + ret);
    setTimeout(call, 1000);
  });
};

for (var i = 0; i < 2; i++) {
  setTimeout(call, Math.random() * 2000);
}
