var BYTE_MASK = 0xFF;
var SHORT_MASK = 0xFFFF;

function loUint16(x) {
  // mask as byte
  return x & BYTE_MASK;
}
function hiUint16(x)
{
  // right shift one byte, mask as byte
  return (x >> 8) & BYTE_MASK;
}
function loUint32(x)
{
  // mask as byte
  return x & SHORT_MASK;
}
function hiUint32(x)
{
  // right shift two byte, mask as short
  return (x >> 16) & SHORT_MASK;
}

module.exports.loUint16 = loUint16;
module.exports.hiUint16 = hiUint16;
module.exports.loUint32 = loUint32;
module.exports.hiUint32 = hiUint32;
module.exports.BYTE_MASK = BYTE_MASK;
module.exports.SHORT_MASK = SHORT_MASK;
