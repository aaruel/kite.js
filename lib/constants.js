'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
function asObjectOf(list) {
  return list.reduce((events, event) => {
    events[event] = event;
    return events;
  }, {});
}
const Version = exports.Version = '1.0.13';
const KnownEvents = exports.KnownEvents = ['backOffFailed', 'tokenExpired', 'tokenSet', 'register', 'message', 'request', 'critical', 'notice', 'error', 'warn', 'info', 'open', 'close', 'debug'];

const Event = exports.Event = asObjectOf(KnownEvents);

const KnownAuthTypes = exports.KnownAuthTypes = ['token'];
const AuthType = exports.AuthType = asObjectOf(KnownAuthTypes);

const TimerHandles = exports.TimerHandles = ['heartbeatHandle', 'expiryHandle', 'backoffHandle'];
const WhiteList = exports.WhiteList = ['kite.heartbeat', 'kite.ping'];

const State = exports.State = { NOTREADY: 0, READY: 1, CLOSED: 3, CONNECTING: 5 };

const DebugLevel = exports.DebugLevel = {
  CRITICAL: 0,
  ERROR: 1,
  WARNING: 2,
  NOTICE: 3,
  INFO: 4,
  DEBUG: 5
};

const Backoff = exports.Backoff = {
  MAX_DELAY: 1000 * 15, // 15 seconds,
  MAX_RECONNECT_ATTEMPTS: 50,
  MULTIPLY_FACTOR: 1.4,
  INITIAL_DELAY: 700 // ms,
};

const Defaults = exports.Defaults = {
  KiteInfo: {
    username: 'anonymous',
    environment: 'browser-environment',
    name: 'browser-kite',
    version: Version,
    region: 'browser-region',
    hostname: 'browser-hostname'
  }
};

const KontrolActions = exports.KontrolActions = {
  REGISTER: 'register',
  DEREGISTER: 'deregister'
};
//# sourceMappingURL=constants.js.map