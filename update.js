var noble = require('noble');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var intel_hex = require('intel-hex');
var async = require('async');
var binary = require('./binary.js')

var DFU_SERVICE     = '000015301212efde1523785feabcd123' 
var DFU_CTRLPT_CHAR   = '000015311212efde1523785feabcd123' 
var DFU_PKT_CHAR = '000015321212efde1523785feabcd123' 
var ATT_MTU = 23;

if (!argv.f || !argv.b) {
  printHelp();
}
var mac = argv.b.match(/[0-9a-fA-F][^:]/g).join('').toLowerCase();
if (mac.length != 12) {
  console.log('invalid ble address');
  printHelp();
}

updater = new Updater(mac, argv.f);

function Updater(mac, fname) {

  var self = this;
  
  this.fileBuffer = null;
  this.targetMAC = mac;
  this.targetDevice = null;
  this.numPackets = null;
  this.initPkt = null;
  this.ctrlptChar = null;
  this.pktChar = null;

  async.series([
    // read firmware hex file and prepare related parameters
    function(callback) {
      fs.readFile(fname, function(err, data) {
        self.fileBuffer = intel_hex.parse(data).data;
        self.numPackets = self.fileBuffer.length/(ATT_MTU-3);
        self.initPkt = initPacket(self.fileBuffer); 
        callback(err, data);
      });
    },
    function(callback) {
      // start scanning BLE devices
      noble.on('stateChange', function(state) {
        if (state === 'poweredOn') {
          console.log('starting scan...');
          noble.startScanning([DFU_SERVICE], false);
        } else {
          noble.stopScanning();
        }
        callback(null, 2);
      });
    },
    function(callback) {
      // when we discover devices
      noble.on('discover', discoverDevice);
      callback(null, 3);
    }
  ],
  function(err, results) {
    if (err) throw err;
  });
  
  // when a scan discovers a device, check if its MAC is what was supplied 
  function discoverDevice(peripheral) {
    console.log('discovered device: ' + peripheralToString(peripheral));
    if (peripheral.id == self.targetMAC) {
      self.targetDevice = peripheral;
      console.log('found requested peripheral: ' + peripheralToString(peripheral)); 
      dfuStart();
    }
  }

  function dfuStart() {
    async.series([
    // Connect to target
    function(callback) {
      self.targetDevice.connect(function(err) {
        console.log('connected to ' + peripheralToString(self.targetDevice));
        callback(err, 1);
      });
    },
    // Get DFU Service
    function(callback) {
      self.targetDevice.discoverServices([DFU_SERVICE], function(err, services) {
        self.dfuServ = services[0];
        callback(err, 2);
      });
    },
    // Get DFU Characteristics
    function(callback) {
      self.dfuServ.discoverCharacteristics([DFU_CTRLPT_CHAR, DFU_PKT_CHAR],
        function (err, chars)
      {
        self.ctrlptChar = chars[0];
        self.pktChar = chars[1];
        callback(err, 3);
      });
    },
    // Start DFU (write 0x01 to DFU Control Point)
    function(callback) {
      self.ctrlptChar.write(Buffer([0x01]), false, function(err) {
        callback(err, 4); 
      });
    },
    // Send image size
    function(callback) {
      var sizeBuf = new Buffer(16);
      sizeBuf.fill(0);
      // TODO allow softdevice and bootloader, maybe do this when fileBuffer filled
      sizeBuf[12] = binary.loUint16(binary.loUint32(self.fileBuffer.length));
      sizeBuf[13] = binary.hiUint16(binary.loUint32(self.fileBuffer.length));
      sizeBuf[14] = binary.loUint16(binary.hiUint32(self.fileBuffer.length));
      sizeBuf[15] = binary.hiUint16(binary.hiUint32(self.fileBuffer.length));
      
      self.pktChar.write(sizeBuf, false, function(err) {
        callback(err, 5);
      });
    },
    // Initialize DFU Parameters (write 0x02 to DFU Control Point)
    function(callback) {
      self.ctrlptChar.write(Buffer([0x02]), false, function(err) {
        callback(err, 6); 
      });
    },
    // Send Init Packet
    function(callback) {
      self.pktChar.write(self.initPacket, false, function(err) {
        callback(err, 7);
      });
    },
    // Send FW Image (write 0x03 to DFU Control Point)
    function(callback) {
      self.ctrlptChar.write(Buffer([0x03]), false, function(err) {
        callback(err, 8);
      });
    }//,
    //// Send FW Image packets
    //function(callback) {
    //  var i = 0;
    //  async.whilst(function(){
    //    return i < self.numPackets;
    //  },
    //  function(callback) {
    //    self.pktChar.write(self.fileBuffer.slice(i, i+(ATT_MTU-3)), false, function(err) {
    //      
    //    });
    //  }
    //  callback(err, 9);
    //}
    ],
    function(err, results) {
      if (err) throw err;
    }); 
  }
  
  function initPacket(data) {
    // calculate CRC:
    var crc = crc16(data); 
    console.log('calculated crc of firmware: 0x' + crc.toString(16)); 
    var packet = new Buffer(14);
    
    // TODO change to be an option
    // Device Type:
    packet[0]   = 0xFF;
    packet[1]   = 0xFF;
    // Device Revision:
    packet[2]   = 0xFF;
    packet[3]   = 0xFF;
    // Application Version:
    packet[4]   = 0xFF;
    packet[5]   = 0xFF;
    packet[6]   = 0xFF;
    packet[7]   = 0xFF;
    // Softdevice array length:
    packet[8]   = binary.loUint16(0x1);
    packet[9]   = binary.hiUint16(0x1);
    // Softdevice[1]:
    packet[10]  = binary.loUint16(0xFFFE);
    packet[11]  = binary.hiUint16(0xFFFE);
    // CRC16:
    packet[12]  = binary.loUint16(crc);
    packet[13]  = binary.hiUint16(crc);

    return packet; 
  }

  function crc16(data, start) {
    var crc = start || 0xFFFF;
    for(var i = 0; i < data.length; i++) {
      crc = ((crc >> 8) & 0xFF | (crc << 8)) & 0xFFFF;
      crc ^= data[i];
      crc ^= ((crc & 0xFF) >> 4) & 0xFFFF;
      crc ^= ((crc << 8) << 4) & 0xFFFF;
      crc ^= (((crc & 0xFF) << 4) << 1) & 0xFFFF;
    }
    
    return crc;
  } 
}

function peripheralToString(peripheral) {
  return peripheral.id.match(/../g).join(':') + ' '
    + peripheral.advertisement.localName;
}

function printHelp() {
  console.log('-b provides device address in the form XX:XX:XX:XX:XX:XX:XX');
  console.log('-f provides a required filename for firmware *.hex\n');
  process.exit();
};
