import { defaultHandler, HTTPHandler } from './serveBinaris';
export { Handler, HandlerError, UnauthorizedError, getHandler } from './handler';
export { HTTPHandler };

export { defaultHandler };
export function setHTTPHandler(override: HTTPHandler) {
  module.exports.defaultHandler = override;
}
