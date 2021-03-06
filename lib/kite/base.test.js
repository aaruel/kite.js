'use strict';

var _expect = require('expect');

var _expect2 = _interopRequireDefault(_expect);

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _ = require('.');

var _2 = _interopRequireDefault(_);

var _kiteapi = require('../kiteapi');

var _kiteapi2 = _interopRequireDefault(_kiteapi);

var _server = require('../server');

var _server2 = _interopRequireDefault(_server);

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logLevel = 0;

const makeKite = (options = {}) => {
  options = Object.assign({}, {
    url: 'ws://localhost',
    autoConnect: false,
    autoReconnect: false,
    logLevel: 0
  }, options);

  return new _base2.default(options);
};

describe('BaseKite', () => {
  it('should expose DebugLevels', () => {
    (0, _expect2.default)(_base2.default.DebugLevel).toExist();
  });

  it('should expose SockJS and WebSocket as transport class', () => {
    (0, _expect2.default)(_base2.default.transport.SockJS).toExist();
    (0, _expect2.default)(_base2.default.transport.WebSocket).toExist();
  });

  describe('constructor', () => {
    it('requires a valid url', () => {
      (0, _expect2.default)(() => new _base2.default({ url: 'foo' })).toThrow(/invalid url/);
      (0, _expect2.default)(() => new _base2.default({ autoConnect: false, url: 'http://localhost' })).toNotThrow();
    });

    it('accepts a prefix', () => {
      const kite = makeKite({ prefix: '/foo' });
      (0, _expect2.default)(kite.options.url).toBe('ws://localhost/foo');
    });

    it('starts with NOTREADY readyState', () => {
      const kite = makeKite();
      (0, _expect2.default)(kite.readyState).toBe(_constants.State.NOTREADY);
    });
  });

  describe('getToken', () => {
    it('returns auth token', () => {
      const kite = makeKite({
        auth: {
          key: 'foo'
        }
      });

      (0, _expect2.default)(kite.getToken()).toBe('foo');
    });
  });

  describe('setToken', () => {
    it('fails if kite is initialized with default auth type token', () => {
      const kite = makeKite({
        auth: _constants.AuthType.token /* === 'token' */
      });

      (0, _expect2.default)(() => kite.setToken('foo')).toThrow(/Invalid auth type/);
    });

    it('fails if kite is initialized without any auth options', () => {
      const kite = makeKite();

      (0, _expect2.default)(() => kite.setToken('foo')).toThrow(/Auth option must be set/);
    });

    it('works well if kite is initialized with correct auth options', () => {
      const kite = makeKite({
        auth: {
          key: 'foo'
        }
      });

      kite.setToken('bar');

      (0, _expect2.default)(kite.getToken()).toBe('bar');
    });
  });

  describe('getKiteInfo', () => it('should return default kite info if no option provided', () => {
    let kite = new _base2.default({
      url: 'ws://localhost',
      autoConnect: false
    });
    (0, _expect2.default)(kite).toExist();

    let kiteInfo = kite.getKiteInfo();
    delete kiteInfo.id; // new id generated each time
    (0, _expect2.default)(kiteInfo).toEqual(_constants.Defaults.KiteInfo);
  }));

  describe('setApi', () => {
    it('should allow defining api after init', done => {
      let kite = new _base2.default({
        url: 'ws://localhost',
        autoConnect: false
      });
      (0, _expect2.default)(kite).toExist();
      (0, _expect2.default)(kite.api.methods.foo).toNotExist();
      (0, _expect2.default)(kite.api.methods['kite.ping']).toExist();

      kite.setApi(new _kiteapi2.default(kite, {
        auth: false,
        methods: {
          foo: function (bar, callback) {
            callback(null, bar);
          }
        }
      }));

      (0, _expect2.default)(kite.api.methods.foo).toExist();
      (0, _expect2.default)(kite.api.methods['kite.ping']).toExist();

      done();
    });

    it('should work with the default api', done => {
      const kiteServer = new _server2.default({
        name: 'kite-server',
        auth: false,
        logLevel
      });

      const kite = new _2.default({
        url: 'http://0.0.0.0:7780',
        autoConnect: false,
        logLevel
      });

      (0, _expect2.default)(kite).toExist();
      (0, _expect2.default)(kite.api.methods['kite.echo']).toExist();

      kiteServer.listen(7780);

      kiteServer.server.once('connection', connection => {
        connection.kite.tell('kite.echo', 'foo').then(res => (0, _expect2.default)(res).toBe('foo')).finally(() => {
          kite.disconnect();
          kiteServer.close();
          done();
        });
      });

      kite.connect();
    });

    it('should work with the new api', done => {
      const kiteServer = new _server2.default({
        name: 'kite-server',
        auth: false,
        logLevel
      });

      const kite = new _2.default({
        url: 'http://0.0.0.0:7780',
        autoConnect: false,
        logLevel
      });

      let squareApi = new _kiteapi2.default(kite, {
        auth: false,
        methods: {
          square: function (x, callback) {
            callback(null, x * x);
          }
        }
      });

      let cubeApi = new _kiteapi2.default(kite, {
        auth: false,
        methods: {
          cube: function (x, callback) {
            callback(null, x * x * x);
          }
        }
      });

      (0, _expect2.default)(kite).toExist();

      (0, _expect2.default)(kite.api.methods.square).toNotExist();
      (0, _expect2.default)(kite.api.methods.cube).toNotExist();

      kite.setApi(squareApi);

      (0, _expect2.default)(kite.api.methods.square).toExist();
      (0, _expect2.default)(kite.api.methods.cube).toNotExist();

      kiteServer.listen(7780);

      kiteServer.server.once('connection', connection => {
        connection.kite.tell('square', 5).then(res => (0, _expect2.default)(res).toBe(25)).finally(() => {
          kite.setApi(cubeApi);
          (0, _expect2.default)(kite.api.methods.square).toNotExist();
          (0, _expect2.default)(kite.api.methods.cube).toExist();

          connection.kite.tell('cube', 5).then(res => (0, _expect2.default)(res).toBe(125)).finally(() => {
            kite.disconnect();
            kiteServer.close();
            done();
          });
        });
      });

      kite.connect();
    });
  });
});
//# sourceMappingURL=base.test.js.map