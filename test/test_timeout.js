'use strict';

const clouds = require('../');
const assert = require('assert');
const async = require('async');
const Monitor = require('super-queue').Monitor;

describe('timeout', function () {

  before(function (done) {
    const m = new Monitor({interval: 1});
    done();
  });

  it('test3 - normal call', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({timeout: 1});
    async.series([
      function (next) {
        c.bind('test3.timeout.1');
        c.ready(next);
      },
      function (next) {
        s.register('test3.timeout.1', function (callback) {
          setTimeout(callback, 2000);
        }, next);
      },
      function (next) {
        c.call('test3.timeout.1', [], function (err, ret) {
          assert.notEqual(err, null);
          assert.equal(err.code, 'CLOUDS_CALL_SERVICE_TIMEOUT');
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      assert.equal(err, null);
      Promise.all([s.exitP(), c.exitP()]).then(ret => done()).catch(done);
    });
  });
return;
  it('test3 - normal bind', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({timeout: 1});

    const timeout2 = c.bind('test3.timeout.2');

    async.series([
      function (next) {
        s.register('test3.timeout.2', function (callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout2(function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - retry', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({
      timeout: 1,
      notAutoCleanRemoteServer: true
    });

    const timeout3 = c.bind('test3.timeout.3', 3);
    let counter = 0;

    async.series([
      function (next) {
        s.register('test3.timeout.3', function (callback) {
          counter++;
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout3(function (err, ret) {
          console.log(arguments);
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          counter.should.equal(4);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - retry & assigned onRetry', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({
      timeout: 1,
      notAutoCleanRemoteServer: true
    });

    const timeout4 = c.bind('test3.timeout.4', 1, function (v, callback) {
      v.should.equal(arg1);
      counter1++;
      callback(v + 1);
    });
    let counter1 = 0;
    let counter2 = 0;
    const arg1 = parseInt(Math.random() * 10, 10);

    async.series([
      function (next) {
        s.register('test3.timeout.4', function (v, callback) {
          v.should.equal(arg1 + 1);
          counter2++;
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout4(arg1, function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          counter1.should.equal(2);
          counter2.should.equal(2);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - retry & assigned onRetry', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({
      timeout: 1
    });

    const timeout5 = c.bind('test3.timeout.5', 1, function (v, callback) {
      v.should.equal(arg1);
      counter1++;
      callback(v + 1);
    });
    let counter1 = 0;
    let counter2 = 0;
    const arg1 = parseInt(Math.random() * 10, 10);

    async.series([
      function (next) {
        s.register('test3.timeout.5', function (v, callback) {
          v.should.equal(arg1 + 1);
          counter2++;
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout5(arg1, function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_NO_AVAILABLE_SERVER');
          counter1.should.equal(2);
          counter2.should.equal(1);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - auto clear server', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({
      timeout: 1,
      serverMaxAge: 1
    });

    const timeout6 = c.bind('test3.timeout.6', 100);
    let counter = 0;

    async.series([
      function (next) {
        s.register('test3.timeout.6', function (v, callback) {
          counter++;
          if (counter % 2 === 0) {
            callback(null, v + 1);
          } else {
            setTimeout(function () {
              callback(null, v + 1);
            }, 1500);
          }
        }, next);
      },
      function (next) {
        timeout6(123, function (err, ret) {
          should.equal(err, null);
          console.log(counter);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      counter.should.greaterThan(1);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

});
