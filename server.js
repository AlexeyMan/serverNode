/* eslint-disable no-alert, no-console, no-await-in-loop, no-restricted-syntax */
const jsonfile = require('jsonfile');
const ModbusRTU = require('modbus-serial');
const unPack = require('./unPack');
const db = require('./db');

const client = [];
// client[0] = new ModbusRTU();
const file = './config/config.json';
const fileDev = './config/configDev.json';
const DevPac = jsonfile.readFileSync(fileDev);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// запрашиваем конфигурацию портов
const configCon = jsonfile.readFileSync(file);
console.log(configCon.Device);

// jsonfile.readFile(fileDev, (err, obj) => {
//   DevPac = obj;
//   console.log(DevPac);
//   connect();
// });
const Conn = configCon.Connections;
const rDevice = configCon.Device;

// собираем массив клиентов выбранного порта
let arrClient;

function chooseDev(i) {
  const wer = Conn[i].nameConn;
  arrClient = rDevice.filter(e => e.nameConn === wer);
  return arrClient;
}

// собираем массив для каждого клиента
function choosePac(i) {
  const dPac = Conn[i].nameConn;
  const arrCli = rDevice.filter(e => e.nameConn === dPac);
  const nameDev = arrCli.map(dev => dev.typeD);
  const pacDev = nameDev.map(name => DevPac[name]);
  return { pacD: pacDev, arrC: arrCli };
}
// запрос посылки
async function readDev(r, cli) {
  let va;
  // FC1 "Read Coil Status"
  if (r.functionQuery === 1) {
    va = await client[cli].readCoils(r.startAddres, r.Nregistrs);
  } else
  // FC2 "Read Input Status"
  if (r.functionQuery === 2) {
    va = await client[cli].readDiscreteInputs(r.startAddres, r.Nregistrs);
  } else
  // FC3 "Read Holding Registers"
  if (r.functionQuery === 3) {
    va = await client[cli].readHoldingRegisters(r.startAddres, r.Nregistrs);
  } else
  // FC4 "Read Input Registers"
  if (r.functionQuery === 4) {
    va = await client[cli].readInputRegisters(r.startAddres, r.Nregistrs);
  } else
  // FC5 "Force Single Coil"
  if (r.functionQuery === 5) {
    va = await client[cli].writeCoil(r.startAddres, r.write);
  } else
  // FC6 "Preset Single Register"
  if (r.functionQuery === 6) {
    va = await client[cli].writeRegister(r.startAddres, r.write);
  } else
  // FC15 "Force Multiple Coil"
  if (r.functionQuery === 15) {
    va = await client[cli].writeCoils(r.startAddres, r.write); // write arr[]
  } else
  // FC16 "Preset Multiple Registers"
  if (r.functionQuery === 16) {
    va = await client[cli].writeRegisters(r.startAddres, r.write); // write arr[]
  }
  return va;
}

// перезапуск клиента
async function rerun(cli) {
  if (client[cli].isOpen) {
    await client[cli].close();
  }
  client[cli] = new ModbusRTU();
  if (Conn[cli].typeConn === 'COM') {
    connectRTU(cli);
  } else if (Conn[cli].typeConn === 'TCP') {
    connectTcp(cli);
  }
}

const getMeterValue = async (id, cli) => {
  try {
    // set ID of slave
    await client[cli].setID(id);
    // тайм аут ответа
    client[cli].setTimeout(Conn[cli].timeOut);
    const arrReg = await choosePac(cli);
    const arrD = arrReg.pacD;
    const arrCli = arrReg.arrC;

    let val;
    for (let i = 0; i < arrD.length; i += 1) {
      // await sleep(rDevice[i].period);
      for (let a = 0; a < arrD[i].length; a += 1) {
        // читаем регистр
        val = await readDev(arrD[i][a], cli);
        unPack.unPack(arrD[i][a], cli, val, arrCli[i]);
        // задержка между пакетаме
        await sleep(rDevice[i].period);
        console.log(rDevice[i].slaveId, arrD[i][a].startAddres, val);
      }
    }
    // return val;
  } catch (e) {
    console.log(e);
  }
};

// let conPackDevTcp;
const getDataValue = async (ids, cli) => {
  try {
    // выбираем слайвы
    for (const id of ids) {
      await getMeterValue(id.slaveId, cli);
      // wait 100ms before get another device
      await sleep(50);
    }
  } catch (e) {
    console.log(e);
  } finally {
    // after get all data from salve repeate it again
    setImmediate(() => {
      if (client[cli].isOpen) {
        getDataValue(ids, cli);
      } else {
        rerun(cli);
      }
    });
  }
};

// устанавливаем  соединение ТCP
function connectTcp(i) {
  // const asd = DevPac;
  client[i].connectTCP(Conn[i].IP, {
    port: Conn[i].portTcp,
  })
    .then(() => {
      console.log(`Connected ${client[i].isOpen}`, Conn[i].IP);
      const conPack = chooseDev(i);
      return conPack;
    }).then((conPack) => {
      db.creatDocConn(Conn[i], conPack, DevPac);
      getDataValue(conPack, i);
    })
    .catch((e) => {
      console.log(e.message);
      setTimeout(() => {
        // if (client[i].isOpen === false) { reConnect(i); }
        rerun(i);
      }, 10000);
    });
}

// устанавливаем  соединение RTU
function connectRTU(i) {
  client[i].connectRTUBuffered(`COM${Conn[i].Ncom}`, {
    baudRate: Conn[i].speed,
    Parity: Conn[i].parity,
    stopBits: Conn[i].stopBit,
    dataBits: Conn[i].bit,
  })
    .then(() => {
      console.log(`Connected ${client[i].isOpen} COM${Conn[i].Ncom}`);
      const conPack = chooseDev(i);
      return conPack;
    }).then((conPack) => {
      db.creatDocConn(Conn[i], conPack, DevPac);
      getDataValue(conPack, i);
    })
    .catch((e) => {
      console.log(e.message);
      setTimeout(() => {
        rerun(i);
      }, 10000);
    });
}

// установка соединения с портом
function reConnect(i) {
  if (client[i].isOpen) {
    console.log('alreadyOpen');
  } else
  if (Conn[i].typeConn === 'COM') {
    connectRTU(i);
  } else if (Conn[i].typeConn === 'TCP') {
    connectTcp(i);
  }
}

// создаем клиентов
function connect() {
  for (let i = 0; i < Conn.length; i += 1) {
    client[i] = new ModbusRTU();
    reConnect(i);
  }
}
connect();
