'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dnodeProtocol = require('dnode-protocol');

var _dnodeProtocol2 = _interopRequireDefault(_dnodeProtocol);

var _atob = require('atob');

var _atob2 = _interopRequireDefault(_atob);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _emitter = require('./emitter');

var _emitter2 = _interopRequireDefault(_emitter);

var _now = require('./now');

var _now2 = _interopRequireDefault(_now);

var _backoff = require('./backoff');

var _backoff2 = _interopRequireDefault(_backoff);

var _handleIncomingMessage = require('./handleIncomingMessage');

var _handleIncomingMessage2 = _interopRequireDefault(_handleIncomingMessage);

var _timeout = require('./timeout');

var _timeout2 = _interopRequireDefault(_timeout);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _messagescrubber = require('./messagescrubber');

var _messagescrubber2 = _interopRequireDefault(_messagescrubber);

var _constants = require('../constants');

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _sockjsClient = require('sockjs-client');

var _sockjsClient2 = _interopRequireDefault(_sockjsClient);

var _kiteapi = require('../kiteapi');

var _kiteapi2 = _interopRequireDefault(_kiteapi);

var _kitelogger = require('../kitelogger');

var _kitelogger2 = _interopRequireDefault(_kitelogger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class BaseKite extends _emitter2.default {

  constructor(options = {}) {
    options = typeof options === 'string' ? { url: options } : options;
    super();

    this.id = _uuid2.default.v4();
    this.options = Object.assign({}, BaseKite.defaultOptions, options);

    if (this.options.url && this.options.prefix) {
      this.options.url += this.options.prefix;
    }

    this.logger = new _kitelogger2.default({
      name: this.options.name || 'kite',
      level: this.options.logLevel
    });

    // refresh expired tokens
    this.expireTokenOnExpiry();

    this.readyState = _constants.State.NOTREADY;

    this.setApi(new _kiteapi2.default(this, {
      // to be backwards compatible we don't allow client apis to be
      // authenticated.
      auth: false,
      methods: this.options.api
    }));

    const { connection, autoConnect, autoReconnect } = this.options;

    // if we have a connection already dismiss the `autoConnect` and
    // `autoReconnect` options.
    if (connection) {
      if (connection.readyState === connection.CLOSED) {
        throw new Error('Given connection is closed, try with a live connection or pass a url option to let Kite create the connection');
      }

      this.addConnectionHandlers(connection);
      this.ws = connection;

      // if the connection is already open trigger `onOpen`.
      if (connection.readyState === connection.OPEN) {
        this.onOpen();
      }
    } else {
      autoReconnect && this.initBackoff();
      autoConnect && this.connect();
    }
  }

  setApi(api) {
    if (api instanceof _kiteapi2.default) {
      this.api = api;

      this.proto = (0, _dnodeProtocol2.default)(this.api.methods);
      this.messageScrubber = new _messagescrubber2.default({ kite: this });

      this.proto.on(_constants.Event.request, req => {
        const message = JSON.stringify(req);
        this.ready(() => this.ws.send(message));
        this.logger.debug('Sending:', message);
      });
    } else {
      throw new Error('A valid KiteApi instance is required!');
    }
  }

  getToken() {
    return this.options.auth.key;
  }

  setToken(token) {
    // FIXME: this setter is not symettrical with the getter
    const { auth } = this.options;

    if (auth && auth === _constants.AuthType.token) {
      throw new Error('Invalid auth type!');
    }

    if (!auth) {
      throw new Error('Auth option must be set before setting a token');
    }

    auth.key = token;
    return this.emit(_constants.Event.tokenSet, token);
  }

  canConnect() {
    return ![_constants.State.CONNECTING, _constants.State.READY].includes(this.readyState);
  }

  canReconnect() {
    // we don't want to reconnect if a connection is passed already.
    return !this.options.connection && this.options.autoReconnect;
  }

  connect() {
    if (!this.canConnect()) {
      return;
    }
    this.readyState = _constants.State.CONNECTING;
    const { url, transportClass: Konstructor, transportOptions } = this.options;

    // websocket will whine if extra arguments are passed
    this.ws = Konstructor === _ws2.default ? new Konstructor(url) : new Konstructor(url, null, transportOptions);

    this.addConnectionHandlers(this.ws);

    this.logger.info(`Trying to connect to ${url}`);
  }

  addConnectionHandlers(connection) {
    connection.addEventListener(_constants.Event.open, this.bound('onOpen'));
    connection.addEventListener(_constants.Event.close, this.bound('onClose'));
    connection.addEventListener(_constants.Event.message, this.bound('onMessage'));
    connection.addEventListener(_constants.Event.error, this.bound('onError'));
    connection.addEventListener(_constants.Event.info, info => this.logger.info(info));
  }

  cleanTimerHandlers() {
    for (let handle of _constants.TimerHandles) {
      if (this[handle] != null) {
        this[handle].clear();
        this[handle] = null;
      }
    }
  }

  disconnect(reconnect = false) {
    this.cleanTimerHandlers();
    this.options.autoReconnect = !!reconnect;
    if (this.ws != null) {
      this.ws.close();
    }
    this.logger.notice(`Disconnecting from ${this.options.url}`);
  }

  onOpen() {
    this.readyState = _constants.State.READY;

    this.logger.notice(`Connected to Kite: ${this.options.url}`);

    // FIXME: the following is ridiculous.
    if (typeof this.clearBackoffTimeout === 'function') {
      this.clearBackoffTimeout();
    }

    this.emit(_constants.Event.open);
  }

  onClose(event) {
    this.readyState = _constants.State.CLOSED;
    this.emit(_constants.Event.close, event);

    let dcInfo = `${this.options.url}: disconnected`;
    // enable below to autoReconnect when the socket has been closed
    if (this.canReconnect()) {
      process.nextTick(() => this.setBackoffTimeout(this.bound('connect')));
      dcInfo += ', trying to reconnect...';
    }

    this.logger.info(dcInfo);
  }

  onMessage({ data }) {
    _handleIncomingMessage2.default.call(this, this.proto, data);
  }

  onError(err) {
    this.emit(_constants.Event.error, 'Websocket error!', err);
    this.logger.error('WebSocket error!', err);
  }

  getKiteInfo() {
    const {
      name,
      username,
      environment,
      version,
      region,
      hostname
    } = this.options;

    return {
      id: this.id,
      username: username || _constants.Defaults.KiteInfo.username,
      environment: environment || _constants.Defaults.KiteInfo.environment,
      name: name || _constants.Defaults.KiteInfo.name,
      version: version || _constants.Defaults.KiteInfo.version,
      region: region || _constants.Defaults.KiteInfo.region,
      hostname: hostname || _constants.Defaults.KiteInfo.hostname
    };
  }

  tell(method, params, callback) {
    const scrubbed = this.messageScrubber.scrub(method, params, callback);
    this.proto.emit(_constants.Event.request, scrubbed);
  }

  expireTokenOnExpiry() {
    const { auth = {} } = this.options;
    if (auth.type !== _constants.AuthType.token) return;

    const { auth: { key: token } } = this.options;

    const claimsA = token.split('.')[1];

    const claims = (() => {
      try {
        return JSON.parse((0, _atob2.default)(claimsA));
      } catch (error) {}
    })();

    if (claims != null ? claims.exp : undefined) {
      // the `exp` is measured in seconds since the UNIX epoch; convert to ms
      const expMs = claims.exp * 1000;
      const nowMs = +(0, _now2.default)();
      // renew token before it expires:
      const earlyMs = 5 * 60 * 1000; // 5 min
      const renewMs = expMs - nowMs - earlyMs;
      this.expiryHandle = new _timeout2.default(this.bound('expireToken'), renewMs);
    }
  }

  expireToken(callback) {
    if (callback != null) {
      this.once(_constants.Event.tokenSet, newToken => callback(null, newToken));
    }
    this.emit(_constants.Event.tokenExpired);
    if (this.expiryHandle) {
      this.expiryHandle.clear();
      this.expiryHandle = null;
    }
  }

  ready(callback) {
    if (this.readyState === _constants.State.READY) {
      process.nextTick(callback);
    } else {
      this.once(_constants.Event.open, callback);
    }
  }

  ping(callback) {
    return this.tell('kite.ping', callback);
  }

  static disconnect(...kites) {
    for (let kite of kites) {
      kite.disconnect();
    }
  }

  static random(kites) {
    return kites[Math.floor(Math.random() * kites.length)];
  }
}

BaseKite.version = _constants.Defaults.KiteInfo.version;
BaseKite.Error = _error2.default;
BaseKite.DebugLevel = _constants.DebugLevel;
BaseKite.transport = {
  SockJS: _sockjsClient2.default,
  WebSocket: _ws2.default
};
BaseKite.transportClass = BaseKite.transport.WebSocket;
BaseKite.defaultOptions = {
  autoConnect: true,
  autoReconnect: true,
  prefix: '',
  transportClass: BaseKite.transportClass,
  transportOptions: {}
};
BaseKite.prototype.initBackoff = _backoff2.default;

exports.default = BaseKite;
module.exports = exports['default'];
//# sourceMappingURL=base.js.map