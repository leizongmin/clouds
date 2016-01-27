'use strict';

const clouds = require('../');
const assert = require('assert');
const async = require('async');

describe('multi', function () {

  it('test4 - not the same service name', function (done) {
    const s1 = clouds.createServer();
    const c = clouds.createClient({timeout: 1});
    async.series([
      function (next) {
        c.bindP('test4.multi.1');
        c.bindP('test4.multi.2');
        c.readyP().then(next).catch(next);
      },
      function (next) {
        s1.register('test4.multi.1', function (v, callback) {
          callback(null, v + 1);
        }, next);
      },
      function (next) {
        s1.register('test4.multi.2', function (v, callback) {
          callback(null, v + 2);
        }, next);
      },
      function (next) {
        c.callP('test4.multi.1', [2])
          .then(ret => {
            assert.equal(ret, 3);
            next();
          })
          .catch(next);
      },
      function (next) {
        c.callP('test4.multi.2', [3])
          .then(ret => {
            assert.equal(ret, 5);
            next();
          })
          .catch(next);
      }
    ], function (err) {
      assert.equal(err, null);
      Promise.all([s1.exitP(), c.exitP()])
        .then(ret => done())
        .catch(done);
    });
  });

  it('test5 - not the same service name', function (done) {
    const s1 = clouds.createServer();
    const c = clouds.createClient({timeout: 1});
    async.series([
      function (next) {
        c.bindP('test5.multi.1');
        c.bindP('test5.multi.2');
        c.readyP().then(next).catch(next);
      },
      function (next) {
        s1.register('test5.multi.1', function (v, callback) {
          callback(new Error('e' + v));
        }, next);
      },
      function (next) {
        s1.register('test5.multi.2', function (v, callback) {
          callback(new Error('e2' + v));
        }, next);
      },
      function (next) {
        c.callP('test5.multi.1', [2])
          .then(ret => {
            next(Error('should callback error'));
          })
          .catch(err => {
            assert.equal(err.message, 'e2');
            next();
          });
      },
      function (next) {
        c.callP('test5.multi.2', [3])
          .then(ret => {
            next(Error('should callback error'));
          })
          .catch(err => {
            assert.equal(err.message, 'e23');
            next();
          });
      }
    ], function (err) {
      assert.equal(err, null);
      Promise.all([s1.exitP(), c.exitP()])
        .then(ret => done())
        .catch(done);
    });
  });

  it('test6 - 1000 calls', function (done) {
    const s1 = clouds.createServer();
    const s2 = clouds.createServer();
    const s3 = clouds.createServer();
    const c = clouds.createClient({timeout: 20});

    const MAX = 1000;
    const counter = {a: 0, b: 0, c: 0};
    const multi1 = c.bindP('test6.multi.1', 1);

    async.series([
      function (next) {
        c.bindP('test6.multi.1');
        c.bindP('test6.multi.2');
        c.readyP().then(next).catch(next);
      },
      function (next) {
        s1.register('test6.multi.1', function (v, callback) {
          callback(null, 'a');
        }, next);
      },
      function (next) {
        s2.register('test6.multi.1', function (v, callback) {
          callback(null, 'b');
        }, next);
      },
      function (next) {
        s3.register('test6.multi.1', function (v, callback) {
          callback(null, 'c');
        }, next);
      },
      function (next) {
        async.timesSeries(MAX, function (i, next) {
          multi1(i).then(n => {
            counter[n]++;
            next();
          })
          .catch(next);
        }, next);
      }
    ], function (err) {
      assert.equal(err, null);
      assert.equal((counter.a + counter.b + counter.c), MAX);
      Promise.all([s1.exitP(), s2.exitP(), s3.exitP(), c.exitP()])
        .then(ret => done())
        .catch(done);
    });
  });

});
