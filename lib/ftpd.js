var utils = require('util');
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var log = require('winston');
var net = require('net');
var commands = require('./ftp_commands');
var messages = require('./ftp_messages');
var p;

var FtpServer = function() {
  var self = this;
  self._server = net.createServer();
  self._driver = undefined;

  /**
   * catch server errors and log them
   */
  self._server.on('error', function(err) {
    log.error('Server error: ' + err.message);
  });

  /**
   * Patch server.close
   */
  self._server.closing = false;
  var original_server_close = self._server.close;
  self._server.close = function () {
    log.info("Server shutting down...");
    this.closing = true
    original_server_close.call(this)
  };

  /**
  * Some information when listening
  */
  this._server.on('listening', function () {
    if (self._driver === undefined)
      throw new Error('A driver has not been created for use with the FTP server.');
    log.info('Server listening on ' + self.host + ':' + self.port)
    self.emit("ftp:listening", self.host, self.port);
  });

  /**
   * When server receives a new client socket
   */
  self._server.on('connection', function (socket) {
    /**
     * Configure client connection info
     */
    socket.setTimeout(0);
    socket.setNoDelay();
    socket.dataEncoding = "binary";
    socket.asciiEncoding = "utf8";
    socket.passive = false;
    socket.dataInfo = null;
    socket.username = null;
    socket.loggedIn = false;

    /**
     * Socket response shortcut
     */
    socket.server = self;
    socket.reply = function (status, message, callback) {
      if (!message) message = messages[status.toString()] || 'No information'
      if (this.writable) {
        log.debug("Command reply with " + status.toString() + " - " + message.toString());
        this.write(status.toString() + ' ' + message.toString() + '\r\n', callback)
      }
    }

    /**
     * Data transfer
     */
    socket.dataTransfer = function (handle) {
      function finish (dataSocket) {
        return function (err) {
          if (err) {
            log.error('Data trasfer error: ' + err.message);
            dataSocket.emit('error', err)
          } else {
            dataSocket.end()
          }
        }
      }
      function execute() {
        socket.reply(150)
        handle.call(socket, this, finish(this))
      }
      // Will be unqueued in PASV command
      if (socket.passive) {
        socket.dataTransfer.queue.push(execute)
      }
      // Or we initialize directly the connection to the client
      else {
        dataSocket = net.createConnection(socket.dataInfo.port, socket.dataInfo.host)
        dataSocket.on('connect', execute)
      }
    }
    socket.dataTransfer.queue = []

    /**
     * When socket has established connection, reply with a hello message
     */
    socket.on('connect', function () {
      socket.reply(220)
      self.emit("ftp:connect");
    });

    socket.on('close', function() {
      self.emit('ftp:close');
    });

    /**
     * Received a command from socket
     */
    socket.on('data', function (chunk) {
      /**
       * If server is closing, refuse all commands
       */
      if (self._server.closing) {
        socket.reply(421);
      }
      /**
       * Parse received command and reply accordingly
       */
      var parts = chunk.toString().trim().split(" ");
      var command = parts[0].trim().toUpperCase();
      var args = parts.slice(1, parts.length);
      var callable = commands[command];
      self.emit("ftp:command:data", command, args);
      log.debug('Command received ' + command + " with args " + args.toString());
      if (!callable) {
        socket.reply(502);
      } else {
        callable.apply(socket, args);
      }
    });
  });
};

utils.inherits(FtpServer, EventEmitter);

FtpServer.prototype.listen = function(port, host) {
  this._server.listen(port, host);
  this.host = this._server.address().address;
  this.port = this._server.address().port;
};

FtpServer.prototype.close = function() {
  this._server.close();
};

/**
 * interface to driver creation by creating an
 * event emitter object and binding it as this server's
 * driver
 */
FtpServer.prototype.createDriver = function() {
  var Driver = function() {};
  utils.inherits(Driver, EventEmitter);
  this._driver = new Driver;
  return this._driver;
};

module.exports = FtpServer;

if (!module.parent) {
  var server = new FtpServer;
  server.listen(21)
}
