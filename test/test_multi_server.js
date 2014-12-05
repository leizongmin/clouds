var clouds = require('../');
var should = require('should');
var async = require('async');

describe('multi', function () {

  it('test4 - not the same service name', function (done) {
    var s1 = clouds.createServer();
    var s2 = clouds.createServer();
    var c = clouds.createClient({timeout: 1});
    async.series([
      function (next) {
        s1.register('test4.multi.1', function (v, callback) {
          callback(null, v + 1);
        }, next);
      },
      function (next) {
        s2.register('test4.multi.2', function (v, callback) {
          callback(null, v + 2);
        }, next);
      },
      function (next) {
        c.call('test4.multi.1', [2], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(3);
          next();
        });
      },
      function (next) {
        c.call('test4.multi.2', [3], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(5);
          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      s1.exit();
      s2.exit();
      c.exit();
      done();
    });
  });

  it('test5 - the same service name, one server broken', function (done) {
    var s1 = clouds.createServer();
    var s2 = clouds.createServer();
    var c = clouds.createClient({timeout: 1});

    var counter = 0;
    var multi1 = c.bind('test5.multi.1', 1);

    async.series([
      function (next) {
        s1.register('test5.multi.1', function (v, callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        s2.register('test5.multi.1', function (v, callback) {
          counter++;
          callback(null, v + 2);
        }, next);
      },
      function (next) {
        multi1(2, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(4);
          next();
        });
      },
      function (next) {
        multi1(3, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(5);
          next();
        });
      },
      function (next) {
        multi1(5, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(7);
          next();
        });
      },
      function (next) {
        multi1(13, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(15);
          next();
        });
      },
      function (next) {
        multi1(6, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(8);
          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      counter.should.equal(5);
      s1.exit();
      s2.exit();
      c.exit();
      done();
    });
  });

});
