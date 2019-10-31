import { defaultHandler, HTTPHandler } from './serveBinaris';
export {
  Handler,
  HandlerError,
  UnauthorizedError,
  getHandler,
  getHTTPHandler,
} from './handler';

export { HTTPHandler, defaultHandler };

export function setHTTPHandler(override: HTTPHandler) {
  module.exports.defaultHandler = override;
}
