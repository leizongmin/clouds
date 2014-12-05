var clouds = require('../');
var should = require('should');
var async = require('async');

describe('timeout', function () {

  it('test3 - normal call', function (done) {
    var s = clouds.createServer();
    var c = clouds.createClient({timeout: 1});
    async.series([
      function (next) {
        s.register('test3.timeout.1', function (callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        c.call('test3.timeout.1', [], function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - normal bind', function (done) {
    var s = clouds.createServer();
    var c = clouds.createClient({timeout: 1});

    var timeout1 = c.bind('test3.timeout.1');

    async.series([
      function (next) {
        s.register('test3.timeout.1', function (callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout1(function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      s.exit();
      c.exit();
      done();
    });
  });

});
