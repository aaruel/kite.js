'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handleIncomingMessage;

var _tryJsonParse = require('try-json-parse');

var _tryJsonParse2 = _interopRequireDefault(_tryJsonParse);

var _auth = require('./auth');

var _auth2 = _interopRequireDefault(_auth);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function handleIncomingMessage(proto, message) {
  this.logger.debug(`Receiving: ${message}`);

  if (typeof message === 'string') {
    message = (0, _tryJsonParse2.default)(message);
  }

  const req = message;

  if (req == null) {
    this.logger.warning(`Invalid payload! (${message})`);
    return;
  }

  if (!isKiteReq(req)) {
    this.logger.debug('Handling a normal dnode message');
    return proto.handle(req);
  }

  const { links, method, callbacks } = req;
  const { authentication: auth, responseCallback } = parseKiteReq(req);

  this.logger.debug('Authenticating request');

  return (0, _auth2.default)(this, method, auth, this.key).then(token => {
    this.logger.debug('Authentication passed');

    // set this as the current token for the duration of the synchronous
    // method call.
    // NOTE: this mechanism may be changed at some point in the future.
    this.currentToken = token;

    try {
      proto.handle(req);
    } catch (err) {
      this.logger.debug('Error processing request', err);
      proto.handle(getTraceReq({
        kite: this.getKiteInfo(),
        err,
        responseCallback,
        links,
        callbacks
      }));
    }

    this.currentToken = null;
    return null;
  }).catch(err => {
    this.logger.debug('Authentication failed', err);

    proto.handle(getTraceReq({
      kite: this.getKiteInfo(),
      err,
      responseCallback,
      links,
      callbacks
    }));
  });
}

const isKiteReq = req => req.arguments.length && req.arguments[0] && req.arguments[0].responseCallback && req.arguments[0].withArgs;

const getTraceReq = o => {
  return {
    method: 'kite.echo',
    arguments: [{
      withArgs: [{ error: o.err }],
      responseCallback: o.responseCallback,
      kite: o.kite
    }],
    links: o.links,
    callbacks: o.callbacks
  };
};

const parseKiteReq = req => req.arguments[0];
module.exports = exports['default'];
//# sourceMappingURL=handleIncomingMessage.js.map