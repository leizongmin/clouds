var clouds = require('../');


var s = new clouds.Server({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  heartbeat: 5
});

s.register('test.hello', function (name, msg, callback) {
  var err = new Error('hahaha');
  err.code = Date.now();
  //callback(err.code % 2 === 0 ? err : null, 'Hello ' + name + ', ' + msg);
  //s.exit();
  callback(null, 'Hello ' + name + ', ' + msg);
});
