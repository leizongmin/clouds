const clouds = require('../');


const c = new clouds.Client({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 3
  },
  timeout: 1
});

const testHello = c.bindP('test.hello');
//console.log(c);

c.ready(() => {
  console.log('ready');

  testHello('Glen', 'timestamp is ' + Date.now())
  //c.callP('test.hello', ['Glen', 'timestamp is ' + Date.now()])
    .then(ret => {
      console.log(ret);
      c.exit(err => {
        console.log('exited: err=%s', err);
      });
    })
    .catch(err => {
      console.log(err.stack);
    });
});
