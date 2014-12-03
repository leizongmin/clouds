var clouds = require('../');


var c = new clouds.Client({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  timeout: 2000
});

var testHello = c.bind('test.hello');
//setInterval(function () {
  testHello('Glen', 'timestamp is ' + Date.now(), function (err, ret) {
    console.log(err, ret);
    c.exit();
  });
//}, 1000);
