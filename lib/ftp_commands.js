var net = require('net');
var commands;

/**
 * Commands implemented by the FTP server
 */
commands = {
  /**
   * Unsupported commands
   * They're specifically listed here as a roadmap, but any unexisting command will reply with 202 Not supported
   */
  "ABOR": function () { this.reply(202) }, // Abort an active file transfer.
  "ACCT": function () { this.reply(202) }, // Account information
  "ADAT": function () { this.reply(202) }, // Authentication/Security Data (RFC 2228)
  "ALLO": function () { this.reply(202) }, // Allocate sufficient disk space to receive a file.
  "APPE": function () { this.reply(202) }, // Append.
  "AUTH": function () { this.reply(202) }, // Authentication/Security Mechanism (RFC 2228)
  "CCC":  function () { this.reply(202) }, // Clear Command Channel (RFC 2228)
  "CONF": function () { this.reply(202) }, // Confidentiality Protection Command (RFC 697)
  "ENC":  function () { this.reply(202) }, // Privacy Protected Channel (RFC 2228)
  "EPRT": function () { this.reply(202) }, // Specifies an extended address and port to which the server should connect. (RFC 2428)
  "EPSV": function () { this.reply(202) }, // Enter extended passive mode. (RFC 2428)
  "HELP": function () { this.reply(202) }, // Returns usage documentation on a command if specified, else a general help document is returned.
  "LANG": function () { this.reply(202) }, // Language Negotiation (RFC 2640)
  "LPRT": function () { this.reply(202) }, // Specifies a long address and port to which the server should connect. (RFC 1639)
  "LPSV": function () { this.reply(202) }, // Enter long passive mode. (RFC 1639)
  "MDTM": function () { this.reply(202) }, // Return the last-modified time of a specified file. (RFC 3659)
  "MIC":  function () { this.reply(202) }, // Integrity Protected Command (RFC 2228)
  "MKD":  function () { this.reply(202) }, // Make directory.
  "MLSD": function () { this.reply(202) }, // Lists the contents of a directory if a directory is named. (RFC 3659)
  "MLST": function () { this.reply(202) }, // Provides data about exactly the object named on its command line, and no others. (RFC 3659)
  "MODE": function () { this.reply(202) }, // Sets the transfer mode (Stream, Block, or Compressed).
  "NOOP": function () { this.reply(202) }, // No operation (dummy packet; used mostly on keepalives).
  "OPTS": function () { this.reply(202) }, // Select options for a feature. (RFC 2389)
  "REIN": function () { this.reply(202) }, // Re initializes the connection.
  "STOU": function () { this.reply(202) }, // Store file uniquely.
  "STRU": function () { this.reply(202) }, // Set file transfer structure.
  "PBSZ": function () { this.reply(202) }, // Protection Buffer Size (RFC 2228)
  "SITE": function () { this.reply(202) }, // Sends site specific commands to remote server.
  "SMNT": function () { this.reply(202) }, // Mount file structure.
  "RMD":  function () { this.reply(202) }, // Remove a directory.
  "STAT": function () { this.reply(202) }, //
  /**
   * General info
   */
  "FEAT": function () {
    this.write('211-Extensions supported\r\n')
    // No feature
    this.reply(211, 'End')
  },
  "SYST": function () {
    var socket = this;
    socket.server._driver.on('driver:sys', function(os) {
      this.reply(215, os);
    });
    socket.server.emit('ftp:sys');
  },
  /**
   * Path commands
   */
  "CDUP": function () { // Change to parent directory
    commands.CWD.call(this, '..');
  },
  "CWD":  function (dir) { // Change working directory
    var socket = this;
    socket.server._driver.on('driver:cwd', function(changedDir) {
      socket.reply(250, 'Directory changed to "' + changedDir + '"')
    });
    socket.server.emit('ftp:cwd', dir);
  },
  "PWD":  function () { // Get working directory
    var socket = this;
    socket.server._driver.on('driver:pwd', function(dir) {
      socket.reply(257, '"' + dir + '"');
    });
    socket.server.emit('ftp:pwd');
  },
  "XPWD": function() { // Alias to PWD
    commands.PWD.call(this)
  },
  /**
   * Change data encoding
   */
  "TYPE": function (dataEncoding) {
    if (dataEncoding == "A" || dataEncoding == "I") {
      this.dataEncoding = (dataEncoding == "A") ? this.asciiEncoding : "binary"
      this.reply(200)
    } else {
      this.reply(501)
    }
  },
  /**
   * Authentication
   */
  "USER": function (username) {
    this.username = username
    this.reply(331)
  },
  "PASS": function (password) {
    var socket = this;
    socket.server._driver.on('driver:authenticate', function(valid) {
      if (valid) {
        socket.loggedIn = true;
        socket.reply(230);
      } else {
        socket.reply(530);
      }
    });
    socket.server.emit('ftp:authenticate', socket.username, password);
  },
  /**
   * Passive mode
   */
  "PASV": function () { // Enter passive mode
    var socket = this;
    var dataServer = net.createServer();
    socket.passive = true
    dataServer.on('connection', function (dataSocket) {
      dataSocket.setEncoding(socket.dataEncoding)
      dataSocket.on('connect', function () {
        // Unqueue method that has been queued previously
        if (socket.dataTransfer.queue.length) {
          socket.dataTransfer.queue.shift().call(dataSocket)
        } else {
          dataSocket.emit('error', {"code": 421})
          socket.end()
        }
      }).on('close', function () {
        socket.reply(this.error ? 426 : 226)
        dataServer.close()
      }).on('error', function (err) {
        this.error = err
        socket.reply(err.code || 500, err.message)
      })
    }).on('listening', function () {
      var port = socket.server.port;
      var host = socket.server.host;
      socket.dataInfo = { "host": host, "port": port }
      socket.reply(227, 'PASV OK (' + host.split('.').join(',') + ',' + parseInt(port/256,10) + ',' + (port%256) + ')')
    }).listen()
  },
  /**
   * TODO Active mode
   */
  "PORT": function (info) {
    this.reply(202)
    // Specifies an address and port to which the server should connect.
    /*socket.passive = false;
    var addr = command[1].split(",");
    socket.pasvhost = addr[0]+"."+addr[1]+"."+addr[2]+"."+addr[3];
    socket.pasvport = (parseInt(addr[4]) * 256) + parseInt(addr[5]);
    socket.send("200 PORT command successful.\r\n");*/
  },
  /**
   * Filesystem
   */
  "LIST": function (target) {
    var socket = this;
    socket.dataTransfer(function (dataSocket, finish) {
      socket.server._driver.on('driver:list', function(list) {
        dataSocket.write('\r\n', finish);
      });
    });
    socket.server.emit('ftp:list', target);
  },
  "NLST": function (target) {
    // TODO: just the list of file names
    this.reply(202)
  },
  "RETR": function (file) {
    var socket = this
    socket.dataTransfer(function (dataSocket, finish) {
      socket.fs.readFile(file, function (stream) {
        stream.on('data', function (chunk) {
          dataSocket.write(chunk, socket.dataEncoding)
        })
        stream.on('end', function () {
          dataSocket.end()
        })
      })
    })
  },
  "STOR": function (file) {
    var socket = this
    socket.dataTransfer(function (dataSocket, finish) {
      socket.fs.writeFile(file, function (stream) {
        dataSocket.on('data', function (chunk) {
          stream.write(chunk, socket.dataEncoding)
        })
        dataSocket.on('end', function () {
          stream.end()
        })
      })
    })
  },
  "DELE": function (file) {
    var socket = this
    socket.fs.unlink(file, function () {
      socket.reply(250)
    })
  },
  "RNFR": function (name) {
    this.reply(202)
    // Rename from.
    /*socket.filefrom = socket.fs.cwd() + command[1].trim();
    socket.send("350 File exists, ready for destination name.\r\n");*/
  },
  "RNTO": function (name) {
    this.reply(202)
    // Rename to.
    /*var fileto = socket.fs.cwd() + command[1].trim();
    rn = sys.exec("mv " + socket.filefrom + " " + fileto);
    rn.addCallback(function (stdout, stderr) {
      socket.send("250 file renamed successfully\r\n");
    });
    rn.addErrback(function () {
      socket.send("250 file renamed successfully\r\n");
    });*/
  },
  /**
   * Allow restart interrupted transfer
   */
  "REST": function (start) {
    this.reply(202)
    // Restart transfer from the specified point.
    /*socket.totsize = parseInt(command[1].trim());
    socket.send("350 Rest supported. Restarting at " + socket.totsize + "\r\n");*/
  },
  /**
   * Disconnection
   */
  "QUIT": function () {
    this.reply(221)
    this.end()
  }
}

module.exports = commands;