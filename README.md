# ftp-custom-server

Node.js FTP server that requires you to write your own filesystem implementation.

Perfect for creating a custom FTP server that uses Amazon S3 to store and read the files, or any other implementation you wish!

## Prerequisites

This server runs on Node.js **version 0.8 or higher**, so this must be installed for use.

## Installation

TBA

## Usage

**Currently the server does not come with any default file system implementation so you will have to write your own one to use it - but this is kind of the point!** However, you can see a small example in the [test_driver.js](spec/test_driver.js) that is used for tests.

The communcation between ftp-custom-server and your implementation happens by way of events being emitted back and forth between the ftp server object and your custom 'driver'.

Here are the events that are emitted by the server, and the corresponding events that you must emit to tell the server component to send data back to the user:

* (optional) Server emits `ftp:connect` on connection of a client with no arguments.

* (required) Server emits `ftp:authenticate (string username, string password)` for you to authenticate the user. Your driver must emit `driver:authenticate (bool valid)` with a boolean for whether the user is authenticated or not.

* (required) Server emits `ftp:pwd` when asked for the present working directory. Your driver must emit `driver:pwd (string currentdir)` where `currentdir` is the directory you want the user to be told they are in.

* (required) Server emits `ftp:cwd (string path)` when asked to change the directory. You driver must emit `driver:cwd (string path)` with the path they actually changed to.

* (required) Server emits `ftp:list (string path)` when asked to list the connects of the provided path. Your driver must emit `driver:list (array fileobjects)` where `fileobjects` is an array that contains objects which have the following properties: name, size, type, owner, group, permissions and date.

* More events to come as development continues.

### Example driver

Things are often more illuminating when looking at example code, so here is an example of a *partial* driver file:

```js
// my_driver.js

var FtpServer = require('ftpd'); // this may change!!!

var server = new FtpServer;
var myDriver = server.createDriver(); // this function returns you a new driver object

// catch events emitted by the server using the EventEmitter 'on' function
server.on('ftp:authenticate', function(username, password) {
  // custom logic to authenticate a user
  someCustomFunctionToAuthenticate(username, password, function(valid) {
    // tell the server your authentication result by emitting your own event
    myDriver.emit('driver:authenticate', valid);
  });
});

// other events that are required for usage...

server.on('ftp:list', function(path) {
  // you may wish to hardcode the files a user can see...
  var files = [];
  files.push({
    name: 'myfile.txt',
    size: 60, // put the size in bytes
    type: 'f', // use 'f' for file or 'd' for directory, support for symlinks later
    date: new Date(), // use a js time object
    owner: 'paul', // unix file ownership details
    group: 'github',
    permissions: 'rwxrw-r--' //unix permissions
  });
});

// now that we have a driver implemented, we can start the server running!
server.listen(21, '0.0.0.0'); // you can specify the port and the host for the ftp server

```

## Contributions

Thanks and credit goes to naholyr's [node-ftp-server](https://github.com/naholyr/node-ftp-server) from which this project is based, naholyr's project is in turn based on billywhizz's [nodeftpd](https://github.com/billywhizz/nodeftpd) so equal thanks and credit to him.

## License

ftp-custom-server is provided free of charge under the MIT license.

Copyright (c) 2013 Paul Van de Vreede

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.