'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _constants = require('./constants');

var _wrap = require('./kite/wrap');

var _wrap2 = _interopRequireDefault(_wrap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const isFunction = thing => typeof thing === 'function';

class KiteApi {
  constructor(kite, { auth, methods }) {
    this.auth = auth;
    this.methods = this.setMethods(Object.assign({}, _constants.DefaultApi, _wrap2.default.call(kite, methods)));
    this.methodKeys = Object.keys(this.methods);
  }

  hasMethod(method) {
    if (!method || method === '') return false;
    return this.methodKeys.includes(method);
  }

  setMethods(methods) {
    return Object.keys(methods).reduce((acc, methodName) => {
      return Object.assign(acc, this.setMethod(methodName, methods[methodName]));
    }, {});
  }

  setMethod(methodName, fn) {
    let auth, func;

    if (isFunction(fn)) {
      func = fn;
      auth = undefined;
    } else if (isFunction(fn.func)) {
      func = fn.func;
      auth = fn.auth;
    } else {
      throw new Error(`Argument must be a function or an object with a func property`);
    }

    auth = auth != null ? auth : this.auth;
    func.mustAuth = auth != null ? auth : true;

    return {
      [methodName]: ({ withArgs, authentication, responseCallback, kite }) => {
        const args = Array.isArray(withArgs) ? withArgs : [withArgs];
        func(...args, responseCallback, { kite, authentication });
      }
    };
  }

  shouldAuthenticate(method) {
    return this.methods[method] && this.methods[method].mustAuth;
  }
}
exports.default = KiteApi;
module.exports = exports['default'];
//# sourceMappingURL=kiteapi.js.map