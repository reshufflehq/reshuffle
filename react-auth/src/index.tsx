import React, { FC, createContext, useContext, useEffect } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { Profile } from '@reshuffle/auth';

export { Profile };

export interface AuthState {
  loading: boolean;
  error?: any;
  authenticated?: boolean;
  profile?: Profile;
}

interface SameWindowLoginOptions {
  newWindow: false;
  returnTo?: string;
}

interface NewWindowLoginOptions {
  newWindow: true;
  windowProps?: {
    top?: number,
    left?: number,
    height?: number,
    width?: number,
  };
}

type LoginOptions = SameWindowLoginOptions | NewWindowLoginOptions;

interface LoginManager {
  getLoginURL(returnTo?: string): string;
  getLogoutURL(): string;
  login(opts?: LoginOptions): void;
  logout(): void;
}

interface AuthContextProps extends AuthState, LoginManager {}

function loginManager(loginUrl: string, logoutUrl: string): LoginManager {
  const getLoginURL = (returnTo: string = window.location.pathname) =>
    `${loginUrl}?returnTo=${encodeURIComponent(returnTo)}`;
  return {
    getLoginURL,
    getLogoutURL: () => logoutUrl,
    login: (opts?: LoginOptions) => {
      if (opts && opts.newWindow) {
        const { top, left, height, width } = {
          width: 300,
          height: 250,
          ...(opts.windowProps || {}),
        };

        window.open(
          getLoginURL('/logged-in'),
          'newwindow',
          [
            `width=${width}`,
            `height=${height}`,
            `top=${top || (window.outerHeight - height) / 2}`,
            `left=${left || (window.outerWidth - width) / 2}`,
          ].join(','),
        );
      } else {
        window.open(getLoginURL(opts && opts.returnTo), '_self');
      }
    },
    logout: () => window.open(logoutUrl, '_self'),
  };
}

const defaultContext: AuthContextProps = {
  loading: true,
  ...loginManager('/login', '/logout'),
};

export const AuthContext = createContext<AuthContextProps>(defaultContext);
export const useAuth = (): AuthContextProps => useContext(AuthContext);

export const AuthProvider: FC = ({ children }) => {
  const { result, error, loading, execute } = useAsyncCallback<AuthState>(async () => {
    const req = await fetch('/whoami', { credentials: 'include' });
    if (!req.ok) {
      throw new Error(`Failed to get /whoami ${req.statusText}`);
    }
    const contentType = req.headers.get('content-type');
    if (!(contentType && contentType.startsWith('application/json'))) {
      throw new Error('Failed to GET /whoami JSON data: backend may be missing file _handler.js.');
    }
    return req.json();
  });
  useEffect(() => {
    execute().catch(() => { /* ignore - handled by async callback */ });
    const listener = (ev: StorageEvent) => {
      if (ev.key === '__reshuffle__login') {
        execute().catch(() => { /* ignore - handled by async callback */ });
      }
    };
    window.addEventListener('storage', listener);
    return () => void window.removeEventListener('storage', listener, true);
  }, []);
  return (
    <AuthContext.Provider value={{ ...defaultContext, loading, error, ...result }}>
      {children}
    </AuthContext.Provider>
  );
};
