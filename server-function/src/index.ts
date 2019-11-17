import { defaultHandler, HTTPHandler } from './serveBinaris';
export {
  Handler,
  HandlerError,
  UnauthorizedError,
  getHandler,
  getHTTPHandler,
} from './handler';
import * as invoke from './invoke';
export { getInvokeHandler } from './invoke';

export { HTTPHandler, defaultHandler };

export function setHTTPHandler(override: HTTPHandler) {
  module.exports.defaultHandler = override;
}

/**
 * Use with caution, must be called from @exposed handler before any async operations
 */
export function useSession() {
  return invoke.currentSession;
}
