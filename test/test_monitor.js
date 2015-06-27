var clouds = require('../');
var should = require('should');
var async = require('async');

describe('timeout', function () {

  function checkMessagesClean (c) {
    Object.keys(c._messages).length.should.equal(0);
  }

  it('test8 - normal call', function (done) {
    var s1 = clouds.createServer();
    var s2 = clouds.createServer();
    var s3 = clouds.createServer();
    var m = clouds.createMonitor();
    async.series([
      function (next) {
        s1.register('test8.method.1', function (callback) {
          setTimeout(callback, 100);
        }, next);
      },
      function (next) {
        s1.register('test8.method.2', function (callback) {
          setTimeout(callback, 100);
        }, next);
      },
      function (next) {
        s2.register('test8.method.1', function (callback) {
          setTimeout(callback, 100);
        }, next);
      },
      function (next) {
        s2.register('test8.method.3', function (callback) {
          setTimeout(callback, 100);
        }, next);
      },
      function (next) {
        s3.register('test8.method.2', function (callback) {
          setTimeout(callback, 100);
        }, next);
      },
      function (next) {
        s3.register('test8.method.4', function (callback) {
          setTimeout(callback, 100);
        }, next);
      },
      function (next) {
        m.status(function (err, ret) {
          should.equal(err, null);

          should.exists(ret.servers);
          should.exists(ret.methods);

          should.exists(ret.servers[s1.id]);
          should.exists(ret.servers[s2.id]);
          should.exists(ret.servers[s3.id]);

          should.exists(ret.methods['test8.method.1']);
          should.exists(ret.methods['test8.method.2']);
          should.exists(ret.methods['test8.method.3']);
          should.exists(ret.methods['test8.method.4']);

          function arrayItemsEqual (a, b) {
            a.length.should.equal(b.length);
            a.forEach(function (v) {
              b.indexOf(v).should.not.equal(-1);
            });
          }

          arrayItemsEqual(ret.servers[s1.id], ['test8.method.1', 'test8.method.2']);
          arrayItemsEqual(ret.servers[s2.id], ['test8.method.1', 'test8.method.3']);
          arrayItemsEqual(ret.servers[s3.id], ['test8.method.2', 'test8.method.4']);

          arrayItemsEqual(ret.methods['test8.method.1'], [s1.id, s2.id]);
          arrayItemsEqual(ret.methods['test8.method.2'], [s1.id, s3.id]);
          arrayItemsEqual(ret.methods['test8.method.3'], [s2.id]);
          arrayItemsEqual(ret.methods['test8.method.4'], [s3.id]);

          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      s1.exit();
      s2.exit();
      s3.exit();
      m.exit();
      done();
    });
  });

});
