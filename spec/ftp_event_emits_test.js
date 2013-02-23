require('mocha');
var assert = require('assert');
var FTPClient = require('ftp');

describe("Event emits", function() {
  var server;
  var client;

  beforeEach(function(done) {
    server = require('./test_driver')();
    client = new FTPClient;
    client.on('error', function(err) {
      console.log("There was a client error: " + err.message);
    })
    done();
  });

  afterEach(function(done) {
    if (client.connected) {
      //client.on('end', function() { server.close(); done(); })
      //client.end();
      server.close();
      done();
    } else {
      server.close();
      done();
    }
  });

  describe('ftp:listening', function() {
    it("should pass the host address", function(done) {
      server.on('ftp:listening', function(host, port) {
        assert.equal(host, "0.0.0.0");
        done();
      });
      server.listen(8883);
    });

    it("should pass the port", function(done) {
      server.on('ftp:listening', function(host, port) {
        assert.equal(port, 8883);
        done();
      })
      server.listen(8883);
    });
  });

  describe('ftp:connect', function() {
    it("should run without any parameters", function(done) {
      server.on('ftp:connect', function() {
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883 });
    });
  });

  describe('ftp:authenticate', function() {
    it("should pass the username", function(done) {
      server.on('ftp:authenticate', function(user, pass) {
        assert.equal(user, 'user123');
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883, user: 'user123', password: 'pass1' });
    });

    it("should pass the password", function(done) {
      server.on('ftp:authenticate', function(user, pass) {
        assert.equal(pass, 'pass1');
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883, user: 'user123', password: 'pass1' });
    });
  });

  describe('ftp:pwd', function() {
    it("should run without any parameters", function(done) {
      server.on('ftp:pwd', function() {
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883 });
      client.on('ready', function() {
        client.pwd(function(string) {});
      })
    });
  });

  describe('ftp:sys', function() {
    it("should run without any parameters", function(done) {
      server.on('ftp:sys', function() {
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883 });
      client.on('ready', function() {
        client.system(function(os) {});
      })
    });
  });

  describe('ftp:list', function() {
    it("should pass the path to list", function(done) {
      server.on('ftp:list', function(path) {
        assert.equal(path, '/');
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883 });
      client.on('ready', function() {
        client.list('/', function(list) {});
      });
    });
  });

  describe('ftp:cwd', function() {
    it("should pass the dir to change to", function(done) {
      server.on('ftp:cwd', function(dir) {
        assert.equal(dir, 'test123');
        done();
      });
      server.listen(8883);
      client.connect({ port: 8883 });
      client.on('ready', function() {
        client.cwd("test123", function() {});
      })
    });
  });

  describe('ftp:close', function() {
    it("should run without any parameters on connection close", function(done) {
      server.on('ftp:close', function() {
        done();
      });
      server.listen(8883);
      client.on('ready', function() {
        client.end();
      })
      client.connect({ port: 8883, user: 'user123', pass: 'pass1' });
    });
  });

});