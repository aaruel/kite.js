'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _emitter = require('../kite/emitter');

var _emitter2 = _interopRequireDefault(_emitter);

var _dnodeProtocol = require('dnode-protocol');

var _dnodeProtocol2 = _interopRequireDefault(_dnodeProtocol);

var _tryJsonParse = require('try-json-parse');

var _tryJsonParse2 = _interopRequireDefault(_tryJsonParse);

var _os = require('os');

var _kite = require('../kite');

var _kite2 = _interopRequireDefault(_kite);

var _handleIncomingMessage = require('../kite/handleIncomingMessage');

var _handleIncomingMessage2 = _interopRequireDefault(_handleIncomingMessage);

var _uuid = require('uuid');

var _constants = require('../constants');

var _websocket = require('./websocket');

var _websocket2 = _interopRequireDefault(_websocket);

var _sockjs = require('./sockjs');

var _sockjs2 = _interopRequireDefault(_sockjs);

var _kiteapi = require('../kiteapi');

var _kiteapi2 = _interopRequireDefault(_kiteapi);

var _kitelogger = require('../kitelogger');

var _kitelogger2 = _interopRequireDefault(_kitelogger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class KiteServer extends _emitter2.default {

  constructor(options = {}) {
    super();

    this.options = options;

    if (this.options.hostname == null) {
      this.options.hostname = (0, _os.hostname)();
    }

    this.logger = new _kitelogger2.default({
      name: options.name || 'kite',
      level: options.logLevel
    });

    this.id = (0, _uuid.v4)();
    this.server = null;

    this.setApi(new _kiteapi2.default(this, {
      auth: this.options.auth,
      methods: this.options.api
    }));

    this.currentToken = null;
  }

  setApi(api) {
    if (api instanceof _kiteapi2.default) {
      this.api = api;
    } else {
      throw new Error('A valid KiteApi instance is required!');
    }

    if (this.server != null) {
      this.logger.info(`API change, restarting running server...`);
      this.close();
      this.listen(this.port);
    }
  }

  getToken() {
    return this.currentToken;
  }

  getServerClass() {
    // serverClass is used for backward compatibility
    const { serverClass, transportClass } = this.options;
    return serverClass || transportClass || KiteServer.transport.WebSocket;
  }

  getPrefix() {
    let { prefix } = this.options;
    if (prefix == null) {
      prefix = '';
    }
    if (prefix.length && prefix.charAt(0) !== '/') {
      prefix = `/${prefix}`;
    }
    return prefix;
  }

  listen(port) {
    if (this.server != null) {
      throw new Error('Already listening!');
    }
    this.port = port;
    const prefix = this.getPrefix();
    const { name, logLevel } = this.options;
    const Server = this.getServerClass();
    this.server = new Server({ port, prefix, name, logLevel });
    this.server.on('connection', this.bound('onConnection'));
    this.logger.info(`Listening: ${this.server.getAddress()}`);
  }

  close() {
    if (this.server != null) {
      this.server.close();
    }
    this.server = null;
  }

  handleRequest(ws, response) {
    const { arguments: args, method, callbacks, links } = response;
    const [err, result] = Array.from(args);
    const message = { error: err, result };
    const messageStr = JSON.stringify({
      method,
      arguments: [message],
      links,
      callbacks
    });
    this.logger.debug(`Sending: ${messageStr}`);
    return ws.send(messageStr);
  }

  onConnection(ws) {
    const proto = (0, _dnodeProtocol2.default)(this.api.methods);
    proto.on('request', this.lazyBound('handleRequest', ws));

    const id = ws.getId();

    let transportClass = _kite2.default.transport.WebSocket;
    if (this.getServerClass() === KiteServer.transport.SockJS) {
      transportClass = _kite2.default.transport.SockJS;
    }

    ws.kite = new _kite2.default({
      url: id,
      name: `${this.options.name}-remote`,
      logLevel: this.options.logLevel,
      autoConnect: false,
      autoReconnect: false,
      transportClass
    });

    ws.kite.ws = ws;
    ws.kite.onOpen();

    ws.on('message', rawData => {
      const message = (0, _tryJsonParse2.default)(rawData);
      if (!message) return;
      if (this.api.hasMethod(message.method)) {
        this.handleMessage(proto, message, ws.kite);
      } else {
        if (message.arguments.length === 2) {
          let [error, result] = message.arguments;
          message.arguments = [{ error, result }];
        }
        this.handleMessage.call(ws.kite, ws.kite.proto, message);
      }
    });

    ws.on('close', () => {
      this.logger.info(`Client has disconnected: ${id}`);
    });

    this.logger.info(`New connection from: ${id}`);
  }
}

KiteServer.version = _constants.Defaults.KiteInfo.version;
KiteServer.transport = {
  WebSocket: _websocket2.default,
  SockJS: _sockjs2.default
};
KiteServer.prototype.handleMessage = _handleIncomingMessage2.default;

exports.default = KiteServer;
module.exports = exports['default'];
//# sourceMappingURL=index.js.map