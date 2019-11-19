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
};

export function setHTTPHandler(override: HTTPHandler) {
  module.exports.defaultHandler = override;
}

// Copied from @types/passport/index.d.ts
// TODO: remove duplication in react-auth/src/index.tsx
export interface UserProfile {
  provider: string;
  id: string;
  displayName: string;
  username?: string;
  name?: {
    familyName: string;
    givenName: string;
    middleName?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
  }>;
  photos?: Array<{
    value: string;
  }>;
}

export function getCurrentUser(required?: false): UserProfile | undefined;
export function getCurrentUser(required: true): UserProfile;

/**
 * Use with caution, must be called from @exposed handler before any async operations
 */
export function getCurrentUser(required?: boolean): UserProfile | undefined {
  if (required && currentUser === undefined) {
    throw new AuthenticationError('Authentication required');
  }
  return currentUser;
}
