// Type 3 Test2: Persistent datastore with automatic loading
const Datastore = require('nedb');
const jsfile = require('jsonfile');

const db = new Datastore({ filename: 'C:/serialModbus/datafile', autoload: true });
const fDev = './config/configDev.json';
const pac = jsfile.readFileSync(fDev);
db.persistence.setAutocompactionInterval(60000);
async function insertDoc(doc) {
  try {
    const docId = doc[0].id;
    db.find({ _id: docId }, (err, num) => {
      if (num.length === 0) {
        db.insert(doc, (err, newDoc) => {});
      }
    });
  } catch (err1) {
    const devId = doc._id;
    db.find({ _id: devId }, (err, num) => {
      if (num.length === 0) {
        db.insert(doc, (err, newDoc) => {});
        // console.log(num, doc);
      }
    });
    console.log(err1);
  }
//   await db.remove({ hello: 'worl' }, { multi: true }, (err, numRemoved) => {
//  // numRemoved = 1
//  console.log(err, numRemoved);
//  });
}
let pN = 0;
let countDel;
const timeoutSaveBase = 10000;
function timeout() {
  setTimeout(() => { countDel = false; }, timeoutSaveBase);
}
// добавляем полученный параметр
function updPacet(_id, _name, dataVal) {
  db.count({}, (err, count) => {
    if (pN < count && !countDel) {
      db.update({ id: _id, name: _name },
        { $push: { data: { data: dataVal, time: new Date() } } }, {}, (e, d) => { });
      pN += 1;
    } else {
      countDel = true;
      if (pN >= count) {
        timeout();
      }
      pN = 0;
    }
  });
}

// const qa = JSON.stringify(pacDev[0][0].pacet);
function choosePacet(type, idP) {
  let pacet = [];
  const pacD = pac[type];
  const nameDe = pacD.map(dev => dev.pacet);
  for (let i = 0; i < nameDe.length; i += 1) {
    for (let a = 0; a < nameDe[i].length; a += 1) {
      nameDe[i][a].id = idP;
      delete nameDe[i][a].startReg;
      delete nameDe[i][a].convert;
      delete nameDe[i][a].relation;
      // delete nameDe[i][a].range;
      pacet = pacet.concat(nameDe[i][a]);
      console.log(pacet);
    }
  }
  insertDoc(pacet);
  return pacet;
}
function creatDocConn(conn, dev, pacD) {
  let doc;
  for (let i = 0; i < dev.length; i += 1) {
    doc = {
      _id: `${dev[i].deviceId}`,
      typeDev: `${dev[i].typeD}`,
      connection: {
        typeConn: `${conn.typeConn}`,
        slaveId: `${dev[i].slaveId}`,
        IP: `${conn.IP}`,
        portTcp: `${conn.portTcp}`,
        timeOut: `${conn.timeOut}`,
      },
      pacet: choosePacet(`${dev[i].typeD}`, `${dev[i].deviceId}`),
      // today: new Date(),
    };
    // console.log(pacD);
    insertDoc(doc);
  }
}
exports.creatDocConn = creatDocConn;
exports.updPacet = updPacet;
