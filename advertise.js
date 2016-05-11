var argv = require('minimist')(process.argv.slice(2));
var bleno = require('bleno');

var target = Buffer(argv.a.trim().match(/.{2}/g).reverse().join(""), 'hex');
var data = Buffer([0x00, 0xFF, 0xE0, 0x02, 0x16, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
target.copy(data, 6);
data[0] = data.length - 1;

bleno.on('stateChange', function(state) {
  // if we want to send a packet to a listener instead of connecting to
  // peripheral, we need to advertise to device first
  if (state === 'poweredOn') {
    bleno.startAdvertisingWithEIRData(data);
    setTimeout(function () {
      process.exit();
    }, 2000);
  } else {
    bleno.stopAdvertising();
  }
});
