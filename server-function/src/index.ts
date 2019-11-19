import { Profile } from '@reshuffle/auth';
import { defaultHandler, HTTPHandler } from './serveBinaris';
export {
  Handler,
  HandlerError,
  UnauthorizedError,
  getHandler,
  getHTTPHandler,
} from './handler';
import { getInvokeHandler, currentUser, AuthenticationError } from './invoke';

export {
  getInvokeHandler,
  AuthenticationError,
  HTTPHandler,
  defaultHandler,
  Profile,
};

export function setHTTPHandler(override: HTTPHandler) {
  module.exports.defaultHandler = override;
}

export function getCurrentUser(required?: false): Profile | undefined;
export function getCurrentUser(required: true): Profile;

/**
 * Use with caution, must be called from @exposed handler before any async operations
 */
export function getCurrentUser(required?: boolean): Profile | undefined {
  if (required && currentUser === undefined) {
    throw new AuthenticationError('Authentication required');
  }
  return currentUser;
}
