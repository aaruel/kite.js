'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (userlandApi = {}) {
  const api = {};

  api['kite.heartbeat'] = (duration, ping, callback) => {
    this.heartbeatHandle = new _interval2.default(ping, duration * 1000);
    return callback(null);
  };

  api['kite.ping'] = callback => {
    return callback(null, 'pong');
  };

  api['kite.tunnel'] = callback => {
    return callback(new Error({ message: 'not supported' }));
  };

  api['kite.echo'] = (message, callback) => {
    return callback(null, message);
  };

  api['kite.log'] = (message, callback) => {
    this.emit('info', message);
    return callback(null);
  };

  api['kite.print'] = (message, callback) => {
    console.log(message);
    return callback(null);
  };

  api['kite.prompt'] = (message, callback) => {
    try {
      callback(null, global.prompt(message));
    } catch (err) {
      // const readline = require('readline')
      // const rl = readline.createInterface({
      //   input: process.stdin,
      //   output: process.stdout,
      // })
      // rl.question(message, answer => {
      //   callback(null, answer)
      //   rl.close()
      // })
    }
  };

  api['kite.getPass'] = api['kite.prompt'];

  api['kite.systemInfo'] = callback => {
    const memTotal = _os2.default.totalmem();
    const platform = process.version ? `Node.js ${process.version}` : navigator ? navigator.userAgent : 'JS Platform';

    const info = {
      diskTotal: 0,
      diskUsage: 0,
      state: 'RUNNING',
      uname: _os2.default.platform(),
      homeDir: _os2.default.homedir(),
      memoryUsage: memTotal - _os2.default.freemem(),
      totalMemoryLimit: memTotal,
      platform
    };
    return callback(null, info);
  };

  for (let method of Object.keys(userlandApi || {})) {
    api[method] = userlandApi[method];
  }

  return api;
};

var _interval = require('./interval');

var _interval2 = _interopRequireDefault(_interval);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports['default'];
//# sourceMappingURL=wrap.js.map