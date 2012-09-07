var clouds = require('../');

clouds.connect({
  redis: {
    db:     4,
    prefix: 'TEST:'
  }
});
console.log('Cloud PID=' + clouds.pid);

module.exports = clouds;
