'use strict';

var _expect = require('expect');

var _expect2 = _interopRequireDefault(_expect);

var _kite = require('../kite');

var _kite2 = _interopRequireDefault(_kite);

var _ = require('./');

var _2 = _interopRequireDefault(_);

var _kiteapi = require('../kiteapi');

var _kiteapi2 = _interopRequireDefault(_kiteapi);

var _sockjsClient = require('sockjs-client');

var _sockjsClient2 = _interopRequireDefault(_sockjsClient);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logLevel = 0;

describe('KiteServer', () => {
  it('should expose SockJS and WebSocket as transport class', done => {
    (0, _expect2.default)(_2.default.transport.SockJS).toExist();
    (0, _expect2.default)(_2.default.transport.WebSocket).toExist();
    done();
  });
});

describe('KiteServer with SockJS', () => {
  it('should be able to accept kite connections', done => {
    const kite = new _kite2.default({
      url: 'http://0.0.0.0:7780',
      autoReconnect: false,
      autoConnect: false,
      transportClass: _kite2.default.transport.SockJS,
      logLevel
    });

    const math = new _2.default({
      name: 'math',
      auth: false,
      transportClass: _2.default.transport.SockJS,
      logLevel,
      api: {
        square: function (x, callback) {
          callback(null, x * x);
        }
      }
    });

    kite.on('open', () => {
      kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
        kite.disconnect();
        math.close();
        done();
      });
    });

    math.listen(7780);
    kite.connect();
  });

  it('should allow defining api after init', done => {
    const kite = new _kite2.default({
      url: 'http://0.0.0.0:7780',
      autoReconnect: true,
      autoConnect: false,
      transportClass: _kite2.default.transport.SockJS,
      logLevel
    });

    const math = new _2.default({
      name: 'math',
      transportClass: _2.default.transport.SockJS,
      logLevel
    });

    let squareApi = new _kiteapi2.default(math, {
      auth: false,
      methods: {
        square: function (x, callback) {
          callback(null, x * x);
        }
      }
    });

    let cubeApi = new _kiteapi2.default(math, {
      auth: false,
      methods: {
        cube: function (x, callback) {
          callback(null, x * x * x);
        }
      }
    });

    math.setApi(squareApi);

    kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
      math.setApi(cubeApi);

      kite.disconnect(true);
      kite.on('open', () => {
        kite.tell('cube', 5).then(res => (0, _expect2.default)(res).toBe(125)).finally(() => {
          math.close();
          done();
        });
      });
    });

    math.listen(7780);
    kite.connect();
  });
});

describe('KiteServer with WebSocket', () => {
  it('should be able to accept kite connections', done => {
    const kite = new _kite2.default({
      url: 'http://0.0.0.0:7780',
      autoConnect: false,
      logLevel
    });

    const math = new _2.default({
      name: 'math',
      auth: false,
      logLevel,
      api: {
        square: function (x, callback) {
          callback(null, x * x);
        }
      }
    });

    kite.on('open', () => {
      kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
        kite.disconnect();
        math.close();
        done();
      });
    });

    math.listen(7780);
    kite.connect();
  });
});

describe('KiteServer connection', () => {
  describe('with existing connection', () => {
    it('should throw if the given connection is closed', done => {
      const math = new _2.default({
        name: 'math',
        auth: false,
        logLevel,
        api: {
          square: function (x, callback) {
            callback(null, x * x);
          }
        }
      });

      math.listen(7780);

      const connection = new _ws2.default('ws://localhost:7780');

      connection.on('open', () => {
        connection.on('close', () => {
          math.close();
          (0, _expect2.default)(() => {
            return new _kite2.default({ connection: connection, logLevel });
          }).toThrow(/Given connection is closed/);
          done();
        });
        connection.close();
      });
    });

    it('should work with a WebSocket connection', done => {
      const math = new _2.default({
        name: 'math',
        auth: false,
        logLevel,
        api: {
          square: function (x, callback) {
            callback(null, x * x);
          }
        }
      });

      math.listen(7780);

      const connection = new _ws2.default('ws://localhost:7780');

      const kite = new _kite2.default({
        connection,
        logLevel
      });

      kite.on('open', () => {
        kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
          kite.disconnect();
          math.close();
          done();
        });
      });
    });

    it('should work with a SockJS connection', done => {
      const math = new _2.default({
        name: 'math',
        auth: false,
        transportClass: _2.default.transport.SockJS,
        logLevel,
        api: {
          square: function (x, callback) {
            callback(null, x * x);
          }
        }
      });

      math.listen(7780);

      const connection = new _sockjsClient2.default('http://0.0.0.0:7780');

      const kite = new _kite2.default({
        connection,
        logLevel
      });

      kite.on('open', () => {
        kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
          kite.disconnect();
          math.close();
          done();
        });
      });
    });
  });
});

describe('KiteServer to Remote Kite connection', () => {
  it('should work with WebSocket transport', done => {
    const kite = new _kite2.default({
      url: 'ws://0.0.0.0:7780',
      autoReconnect: false,
      autoConnect: false,
      logLevel,
      api: {
        square: function (x, callback) {
          callback(null, x * x);
        }
      }
    });

    const math = new _2.default({
      name: 'math',
      auth: false,
      logLevel
    });

    math.listen(7780);
    math.server.on('connection', connection => {
      connection.kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
        kite.disconnect();
        math.close();
        done();
      });
    });

    kite.connect();
  });

  it('should work with SockJS transport', done => {
    const kite = new _kite2.default({
      url: 'http://0.0.0.0:7780',
      transportClass: _kite2.default.transport.SockJS,
      autoReconnect: false,
      autoConnect: false,
      logLevel,
      api: {
        square: function (x, callback) {
          callback(null, x * x);
        }
      }
    });

    const math = new _2.default({
      transportClass: _2.default.transport.SockJS,
      name: 'math',
      auth: false,
      logLevel
    });

    math.listen(7780);
    math.server.on('connection', connection => {
      connection.kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
        kite.disconnect();
        math.close();
        done();
      });
    });

    kite.connect();
  });
});
//# sourceMappingURL=index.test.js.map