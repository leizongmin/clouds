var clouds = require('../');


var c = new clouds.Client({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  timeout: 1
});

var testHello = c.bind('test.hello');
//setInterval(function () {
  testHello('Glen', 'timestamp is ' + Date.now(), function (err, ret) {
    console.log(arguments);
    //c.exit();
  });
//}, 1000);

var testRetry = c.bind('test.retry', 10);
testRetry('hahahaha', function (err) {
  console.log(err);
  c.exit();
});
