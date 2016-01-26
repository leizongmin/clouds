'use strict';

const clouds = require('../');
const should = require('should');
const async = require('async');

describe('benchmark', function () {

  function checkMessagesClean (c) {
    Object.keys(c._messages).length.should.equal(0);
  }

  it('test7 - 10000 calls', function (done) {
    const s1 = clouds.createServer();
    const s2 = clouds.createServer();
    const s3 = clouds.createServer();
    const c = clouds.createClient({timeout: 20});

    const MAX = 10000;
    let counter = {a: 0, b: 0, c: 0};
    const multi1 = c.bind('test7.multi.1', 1);

    async.series([
      function (next) {
        s1.register('test7.multi.1', function (v, callback) {
          setTimeout(function () {
            callback(null, 'a');
          }, Math.random() * 200);
        }, next);
      },
      function (next) {
        s2.register('test7.multi.1', function (v, callback) {
          setTimeout(function () {
            callback(null, 'b');
          }, Math.random() * 200);
        }, next);
      },
      function (next) {
        s3.register('test7.multi.1', function (v, callback) {
          setTimeout(function () {
            callback(null, 'c');
          }, Math.random() * 200);
        }, next);
      },
      function (next) {
        async.times(MAX, function (i, next) {
          multi1(i, function (err, n) {
            should.equal(err, null);
            counter[n]++;
            next();
          });
        }, next);
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      (counter.a + counter.b + counter.c).should.equal(MAX);
      console.log(counter);
      s1.exit();
      s2.exit();
      s3.exit();
      c.exit();
      done();
    });
  });

});
