var clouds = require('../');
var should = require('should');
var async = require('async');

describe('send & on message', function () {

  function checkMessagesClean (c) {
    Object.keys(c._messages).length.should.equal(0);
  }

  it('base to base', function (done) {
    var b1 = clouds.createBase();
    var b2 = clouds.createBase();

    var msg = {};

    b2.on('message', function (sender, message) {
      sender.should.equal(b1.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        b1.exit();
        b2.exit();
        done();
      }
    });

    b1.on('listen', function () {
      b1.send(b2.id, 'hello');
      b1.send(b2.id, {a: 123, b: 456});
      b1.send(b2.id, 789);
    });
  });

  it('base to itself', function (done) {
    var b = clouds.createBase();

    var msg = {};

    b.on('message', function (sender, message) {
      sender.should.equal(b.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        b.on('exit', function () {
          done();
        });
        b.exit();
      }
    });

    b.on('listen', function () {
      b.send(b.id, 'hello');
      b.send(b.id, {a: 123, b: 456});
      b.send(b.id, 789);
    });
  });

  it('client to client', function (done) {
    var c1 = clouds.createClient({timeout: 5});
    var c2 = clouds.createClient({timeout: 5});

    var msg = {};

    c2.on('message', function (sender, message) {
      sender.should.equal(c1.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        checkMessagesClean(c1);
        checkMessagesClean(c2);
        c1.exit();
        c2.exit();
        done();
      }
    });

    c1.on('listen', function () {
      c1.send(c2.id, 'hello');
      c1.send(c2.id, {a: 123, b: 456});
      c1.send(c2.id, 789);
    });
  });

  it('client to itself', function (done) {
    var c = clouds.createClient({timeout: 5});

    var msg = {};

    c.on('message', function (sender, message) {
      sender.should.equal(c.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        checkMessagesClean(c);
        c.exit();
        done();
      }
    });

    c.on('listen', function () {
      c.send(c.id, 'hello');
      c.send(c.id, {a: 123, b: 456});
      c.send(c.id, 789);
    });
  });

  it('server to server', function (done) {
    var s1 = clouds.createServer({heartbeat: 2});
    var s2 = clouds.createServer({heartbeat: 2});

    var msg = {};

    s2.on('message', function (sender, message) {
      sender.should.equal(s1.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        checkMessagesClean(s1);
        checkMessagesClean(s2);
        s1.exit();
        s2.exit();
        done();
      }
    });

    s1.on('listen', function () {
      s1.send(s2.id, 'hello');
      s1.send(s2.id, {a: 123, b: 456});
      s1.send(s2.id, 789);
    });
  });

  it('server to itself', function (done) {
    var s = clouds.createServer({heartbeat: 2});

    var msg = {};

    s.on('message', function (sender, message) {
      sender.should.equal(s.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        checkMessagesClean(s);
        s.exit();
        done();
      }
    });

    s.on('listen', function () {
      s.send(s.id, 'hello');
      s.send(s.id, {a: 123, b: 456});
      s.send(s.id, 789);
    });
  });

  it('client to server', function (done) {
    var c = clouds.createClient({timeout: 5});
    var s = clouds.createServer({heartbeat: 2});

    var msg = {};

    s.on('message', function (sender, message) {
      sender.should.equal(c.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        checkMessagesClean(c);
        checkMessagesClean(s);
        c.exit();
        s.exit();
        done();
      }
    });

    c.on('listen', function () {
      c.send(s.id, 'hello');
      c.send(s.id, {a: 123, b: 456});
      c.send(s.id, 789);
    });
  });

  it('server to client', function (done) {
    var c = clouds.createClient({timeout: 5});
    var s = clouds.createServer({heartbeat: 2});

    var msg = {};

    c.on('message', function (sender, message) {
      sender.should.equal(s.id);
      if (message === 'hello') msg.string = true;
      if (message === 789) msg.number = true;
      if (message && typeof message === 'object' && message.a === 123 && message.b === 456) msg.object = true;
      if (msg.string && msg.number && msg.object) {
        checkMessagesClean(s);
        checkMessagesClean(c);
        c.exit();
        s.exit();
        done();
      }
    });

    s.on('listen', function () {
      s.send(c.id, 'hello');
      s.send(c.id, {a: 123, b: 456});
      s.send(c.id, 789);
    });
  });

});
