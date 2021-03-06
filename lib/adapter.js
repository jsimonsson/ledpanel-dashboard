var SerialPort = require("serialport");
var util = require('./util');
var fs = require('fs');

var Adapter = function() {
  this.serialPort = null;
  this.open = false;
  this.g = new util.PixelBuffer();
  this.scanrow = 0;
  this.preview = false;
}

Adapter.prototype._queueSend = function() {
  // update one row
  var o = this.scanrow * 8;
  var bytes = 8;

  var packet = new Buffer(5 + bytes);

  packet[0] = 'W'.charCodeAt(0);

  packet[1] = o & 255;
  packet[2] = o >> 8;

  packet[3] = bytes & 255;
  packet[4] = bytes >> 8;

  var o2 = this.scanrow * 64;
  for(var j=0; j<bytes; j++) {
    var b = 0;
    for(var k=0; k<8; k++) {
      if (this.g.pixels[o2 ++]) b |= 1 << k;
    }
    packet[5 + j] = b;
  }

  if (this.open && this.serialPort) this.serialPort.write(packet);

  this.scanrow ++;
  this.scanrow %= 16;
}

Adapter.prototype._gotAck = function() {
  setTimeout(this._queueSend.bind(this), 1);
}

Adapter.prototype.findSerial = function(callback) {
  console.log('Adapter: looking for serial ports..');
  var foundport = null;
  var files = fs.readdirSync('/dev');
  if (files) {
    files.forEach(function(port) {
      if (/tty\.usb/.test(port)) {
        foundport = '/dev/' + port;
      }
    });
  }

  callback(foundport);
}

Adapter.prototype.connectSerial = function(port) {
	console.log('Adapter: connectSerial: ' + port);

  var _this = this;

  var _this = this;
  this.serialPort = new SerialPort.SerialPort(port, { baudrate: 57600 });
  this.serialPort.on("open", function () {
    console.log('Adapter: serial port opened.');
    _this.serialPort.write(new Buffer('C'));
    _this.open = true;
  });

  this.serialPort.on("data", function (data) {
    if (data.toString().substring(0, 1) == 'K') { _this._gotAck(); }
  });

  this.serialPort.on("close", function (data) {
    _this.open = false;
    console.log('Adapter: serial port closed.');
  });
}

Adapter.prototype.update = function(pixelbuffer) {
	// console.log('Adapter: update', pixelbuffer);

  if (pixelbuffer) this.g.copyFrom(pixelbuffer);

  if (this.preview) {
    var o = 0;
    var all = '';
    all += '.';
    for(var x=0; x<64; x++) {
      all += '-';
    }
    all += '.\n';
    for(var y=0; y<8; y++) {
      all += '|';
      for(var x=0; x<64; x++) {
        var p0 = this.g.pixels[(y * 2 + 0) * 64 + x];
        var p1 = this.g.pixels[(y * 2 + 1) * 64 + x];
        if (p0 && p1) all += ':';
        else if (p0) all += '`';
        else if (p1) all += '.';
        else all += ' ';
        o ++;
      }
      all += '|';
      all += '\n';
    }
    all += '\'';
    for(var x=0; x<64; x++) {
      all += '-';
    }
    all += '\'\n';
    // all = '\033[2J' + all;
    console.log(all);
  }
}

Adapter.prototype.start = function() {
	console.log('Adapter: start...');
}

exports.Adapter = Adapter;
