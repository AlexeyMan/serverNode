const db = require('./db');


// разбор посылки----------------------------------------------------
function answerRead(pack, data, device) {
  let dataPack;
  for (let i = 0; i < pack.pacet.length; i += 1) {
    const nR = pack.pacet[i].startReg;
    const nameVal = pack.pacet[i].name;
    if (pack.pacet[i].convert === 'readInt16LE') {
      dataPack = data.buffer.readInt16LE(nR);
    } else if (pack.pacet[i].convert === 'readInt16BE') {
      dataPack = data.buffer.readInt16BE(nR);
    } else if (pack.pacet[i].convert === 'readFloatLE') {
      dataPack = data.buffer.readFloatLE(nR);
    } else if (pack.pacet[i].convert === 'readInt32LE') {
      dataPack = data.buffer.readInt32LE(nR);
    } else if (pack.pacet[i].convert === 'readUInt32LE') {
      dataPack = data.buffer.readUInt32LE(nR);
    } else if (pack.pacet[i].convert === 'readUInt16LE') {
      dataPack = data.buffer.readUInt16LE(nR);
    } else { return; }
    // console.log(`nomer${i}${dataPack}`);
    db.updPacet(device.deviceId, nameVal, dataPack);
  }
}

function answerWrite(pack, data) {
  console.log(`write val ${data.data[0]}`);
}

function unPack(pack, cli, data, device) {
  try {
    // console.log(pack, cli, data);
    const pr = pack.write;
    const nr = pack.Nregistrs;
    if (pr) {
      answerWrite(pack, data, device);
    }
    if (nr) {
      answerRead(pack, data, device);
    }
  } catch (e) {
    console.log(e);
  }
  return data;
}

exports.unPack = unPack;
