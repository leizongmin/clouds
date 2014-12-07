var clouds = require('../');
var should = require('should');
var async = require('async');

describe('register & call', function () {

  function checkMessagesClean (c) {
    Object.keys(c._messages).length.should.equal(0);
  }

  it('test1 - normal call', function (done) {
    var s = clouds.createServer();
    var c = clouds.createClient({timeout: 5});

    var checkCallback = {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false
    };

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
          checkCallback.step1 = true;
          next();
        });
      },
      function (next) {
        c.call('test1.args.1', [5], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          checkCallback.step2 = true;
          next();
        });
      },
      function (next) {
        c.call('test1.args.2', [1, 2], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(3);
          checkCallback.step3 = true;
          next();
        });
      },
      function (next) {
        c.call('test1.args.2', [4, 5], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(9);
          checkCallback.step4 = true;
          next();
        });
      },
      function (next) {
        c.call('test1.args.3', [1, 2, 3], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          checkCallback.step5 = true;
          next();
        });
      },
      function (next) {
        c.call('test1.args.3', [4, 5, 6], function (err, ret) {
          should.equal(err, null);
          ret.should.equal(15);
          checkCallback.step6 = true;
          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);

      checkCallback.step1.should.equal(true);
      checkCallback.step2.should.equal(true);
      checkCallback.step3.should.equal(true);
      checkCallback.step4.should.equal(true);
      checkCallback.step5.should.equal(true);
      checkCallback.step6.should.equal(true);

      checkMessagesClean(c);
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

    var checkCallback = {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false
    };

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
          checkCallback.step1 = true;
          next();
        });
      },
      function (next) {
        arg1(5, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          checkCallback.step2 = true;
          next();
        });
      },
      function (next) {
        arg2(1, 2, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(3);
          checkCallback.step3 = true;
          next();
        });
      },
      function (next) {
        arg2(4, 5, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(9);
          checkCallback.step4 = true;
          next();
        });
      },
      function (next) {
        arg3(1, 2, 3, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(6);
          checkCallback.step5 = true;
          next();
        });
      },
      function (next) {
        arg3(4, 5, 6, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(15);
          checkCallback.step6 = true;
          next();
        });
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);

      checkCallback.step1.should.equal(true);
      checkCallback.step2.should.equal(true);
      checkCallback.step3.should.equal(true);
      checkCallback.step4.should.equal(true);
      checkCallback.step5.should.equal(true);
      checkCallback.step6.should.equal(true);

      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

});
