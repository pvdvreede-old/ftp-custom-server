var FtpServer = require('../lib/ftpd');

module.exports = function() {

  var server = new FtpServer;

  var testDriver = server.createDriver();

  server.on('ftp:authenticate', function(user, pass) {
    testDriver.emit('driver:authenticate', true);
  });

  server.on('ftp:pwd', function() {
    testDriver.emit('driver:pwd', '/');
  });

  server.on('ftp:cwd', function(dir) {
    testDriver.emit('driver:cwd', dir);
  });

  server.on('ftp:list', function(path) {
    var files = []
    files.push({
      name: 'test.txt',
      size: 7,
      date: '2012-01-01',
      type: 'f',
      owner: 'paul',
      group: 'pvdvreede'
    });
    testDriver.emit('driver:list', files);
  });

  return server;

};