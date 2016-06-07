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

  it('test3 - normal call - timeoutChecker=0.5', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({timeout: 1, timeoutChecker: 0.5});
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

  it('test3 - normal call - timeoutChecker=1', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({timeout: 1, timeoutChecker: 1});
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

  it('test3 - normal call - no server', function (done) {
    const c = clouds.createClient({timeout: 1});
    async.series([
      function (next) {
        c.bind('test3.timeout.1');
        c.ready(next);
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
      Promise.all([c.exitP()]).then(ret => done()).catch(done);
    });
  });

  it('test3 - normal call - timeoutChecker=1 - no server', function (done) {
    const c = clouds.createClient({timeout: 1, timeoutChecker: 1});
    async.series([
      function (next) {
        c.bind('test3.timeout.1');
        c.ready(next);
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
      Promise.all([c.exitP()]).then(ret => done()).catch(done);
    });
  });

  it('test3 - normal bind', function (done) {
    const s = clouds.createServer();
    const c = clouds.createClient({timeout: 1});

    const timeout2 = c.bind('test3.timeout.2');

    async.series([
      function (next) {
        c.bind('test3.timeout.1');
        c.ready(next);
      },
      function (next) {
        s.register('test3.timeout.2', function (callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout2(function (err, ret) {
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

});
