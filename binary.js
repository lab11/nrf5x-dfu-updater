var BYTE_MASK = 0xFF;
var SHORT_MASK = 0xFFFF;

function loUint16(x)
{
  // mask as byte
  return x & BYTE_MASK;
}
function hiUint16(x)
{
  // right shift one byte, mask as byte
  return (x >> 8) & BYTE_MASK;
}

module.exports.loUint16 = loUint16;
module.exports.hiUint16 = hiUint16;
module.exports.BYTE_MASK = BYTE_MASK;
module.exports.SHORT_MASK = SHORT_MASK;
