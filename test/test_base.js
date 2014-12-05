var clouds = require('../');
var should = require('should');
var async = require('async');

describe('register & call', function () {

  it('test1 - normal call', function (done) {
    var s = clouds.createServer();
    var c = clouds.createClient({timeout: 5});
    async.series([
      function (next) {
        s.register('test1.args.1', function (a, callback) {
          callback(null, a + 1);
        }, next);
      },
      function (next) {
        s.register('test1.args.2', function (a, b, callback) {
          callback(null, a + b);
        }, next);
      },
      function (next) {
        s.register('test1.args.3', function (a, b, c, callback) {
          callback(null, a + b + c);
        }, next);
      },
      function (next) {
        c.call('test1.args.1', [1], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(2);
          next();
        });
      },
      function (next) {
        c.call('test1.args.1', [5], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          next();
        });
      },
      function (next) {
        c.call('test1.args.2', [1, 2], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(3);
          next();
        });
      },
      function (next) {
        c.call('test1.args.2', [4, 5], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(9);
          next();
        });
      },
      function (next) {
        c.call('test1.args.3', [1, 2, 3], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          next();
        });
      },
      function (next) {
        c.call('test1.args.3', [4, 5, 6], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(15);
          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test2: normal bind', function (done) {
    var s = clouds.createServer();
    var c = clouds.createClient({timeout: 5});

    var arg1 = c.bind('test2.args.1');
    var arg2 = c.bind('test2.args.2');
    var arg3 = c.bind('test2.args.3');

    async.series([
      function (next) {
        s.register('test2.args.1', function (a, callback) {
          callback(null, a + 1);
        }, next);
      },
      function (next) {
        s.register('test2.args.2', function (a, b, callback) {
          callback(null, a + b);
        }, next);
      },
      function (next) {
        s.register('test2.args.3', function (a, b, c, callback) {
          callback(null, a + b + c);
        }, next);
      },
      function (next) {
        arg1(1, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(2);
          next();
        });
      },
      function (next) {
        arg1(5, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          next();
        });
      },
      function (next) {
        arg2(1, 2, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(3);
          next();
        });
      },
      function (next) {
        arg2(4, 5, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(9);
          next();
        });
      },
      function (next) {
        arg3(1, 2, 3, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          next();
        });
      },
      function (next) {
        arg3(4, 5, 6, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(15);
          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      s.exit();
      c.exit();
      done();
    });
  });


});
