'use strict';

var clouds = require('./connect');
var assert = require('assert');


function dump () {
  console.log.apply(console, arguments);
}


describe('Service & RemoteService', function () {

  describe('normal', function () {

    var service = null;
    var service_name = 'test_service';
    var remoteService = null;

    it('register', function (done) {
      clouds.register(service_name, function (err, s) {
        assert.equal(err, null);
        service = s;
        done();
      });
    });

    it('set & get & remove', function (done) {
      var name = 'test';
      var value = Math.random();
      service.set(name, value, function (err) {
        assert.equal(err, null);
        service.get(name, function (err, data) {
          assert.equal(err, null);
          assert.equal(data, value);
          service.remove(name, function (err) {
            assert.equal(err, null);
            service.get(name, function (err, data) {
              assert.equal(err, null);
              assert.equal(data, null);
              done();
            });
          });
        });
      });
    });

    it('require & on & emit', function (done) {
      remoteService = clouds.require(service_name);
      var event_name1 = 'test-ooxx';
      var event_name2 = 'kk-ddfdf';
      var argv1 = Math.random();
      var argv2 = new Date().toString();
      var argv3 = {a: Math.random(), b: Math.random()};

      // 有回调
      service.on(event_name1, function (_argv1, _argv2, _argv3, callback) {
        assert.equal(_argv1, argv1);
        assert.equal(_argv2, argv2);
        assert.deepEqual(_argv3, argv3);
        callback(null, argv3, argv1, argv2);
      });

      // 无回调
      service.on(event_name2, function (_argv1, _argv2, _argv3) {
        assert.equal(_argv1, argv1);
        assert.equal(_argv2, argv2);
        assert.deepEqual(_argv3, argv3);
        done();
      });

      remoteService.emit(event_name1, argv1, argv2, argv3, function (err, _argv3, _argv1, _argv2) {
        dump(err, _argv1, _argv2, _argv3);
        assert.equal(err, null);
        assert.equal(_argv1, argv1);
        assert.equal(_argv2, argv2);
        assert.deepEqual(_argv3, argv3);

        remoteService.emit(event_name2, argv1, argv2, argv3);
      });
    });

    it('unregister', function (done) {
      clouds.unregister(service_name, function (err) {
        assert.equal(err, null);
        done();
      });
    });

  });

  describe('timeout & pemit', function () {

    var service = null;
    var service_name = 'test_service2';
    var event_name = 'fffsdds';
    var remoteService = null;
    var emitTimes = 0;
    var maxEmitTimes = 5;

    it('init', function (done) {
      clouds.register(service_name, function (err, s) {
        assert.equal(err, null);
        service = s;
        service.on(event_name, function (ms, callback) {
          emitTimes++;
          if (emitTimes >= maxEmitTimes) return callback(null);
          setTimeout(function () {
            callback(null);
          }, ms);
        });
        done();
      });
    });

    it('timeout & pemit', function (done) {
      remoteService = clouds.require(service_name, {callbackTimeout: 200});
      remoteService.emit(event_name, 50, function (err) {
        assert.equal(err, null);
        emitTimes = 0;
        remoteService.pemit(3, event_name, 300, function (err) {
          assert.equal(/timeout/img.test(err.toString()), true);
          assert.equal(emitTimes, 3);
          remoteService.pemit(-1, event_name, 300, function (err) {
            assert.equal(err, null);
            assert.equal(emitTimes, maxEmitTimes);
            done();
          });
        });
      });
    });

  });

});
