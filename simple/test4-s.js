'use strict';

var clouds = require('clouds');
var cluster = require('cluster');
  
if (cluster.isMaster) {

  for (var i = 0; i < 20; i++) {
    cluster.fork();
  }

  cluster.on('exit', function () {
    cluster.fork();
  });

  setInterval(function () {
    var ids = Object.keys(cluster.workers);
    var id = ids[parseInt(Math.random() * ids.length, 10)];
    var worker = cluster.workers[id];
    if (worker && worker.destroy) {
      worker.destroy();
    }
  }, 2000);

} else {

  clouds.connect({
    redis: {
      db:     4,
      prefix: 'TEST:'
    },
    service: {
      callbackTimeout: 5000
    }
  });
  console.log('PID=' + clouds.pid);

  clouds.register('test4', function (err, service) {
    if (err) throw err;

    service.on('say', function (msg, callback) {
      console.log(clouds.pid + ' on say: ' + msg);
      setTimeout(function () {
        callback(null, 'ok');
      }, Math.random() * 5000);
    });
  });
}
