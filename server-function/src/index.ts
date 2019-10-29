import { defaultHandler, HTTPHandler } from './serveBinaris';
export { Handler, HandlerError, UnauthorizedError, getHandler } from './handler';
export { HTTPHandler, defaultHandler };

export function setHTTPHandler(override: HTTPHandler) {
  module.exports.defaultHandler = override;
}
