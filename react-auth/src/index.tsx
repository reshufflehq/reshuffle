import React, { FC, createContext, useContext } from 'react';
import { useAsync } from 'react-async-hook';
import { Profile } from '@reshuffle/auth';

export { Profile };

export interface AuthState {
  loading: boolean;
  error?: any;
  authenticated?: boolean;
  profile?: Profile;
}

interface LoginManager {
  getLoginURL(returnTo?: string): string;
  getLogoutURL(): string;
  login(returnTo?: string): void;
  logout(): void;
}

interface AuthContextProps extends AuthState, LoginManager {}

function loginManager(loginUrl: string, logoutUrl: string): LoginManager {
  const getLoginURL = (returnTo: string = window.location.pathname) =>
    `${loginUrl}?returnTo=${encodeURIComponent(returnTo)}`;
  return {
    getLoginURL,
    getLogoutURL: () => logoutUrl,
    login: (returnTo?: string) => window.open(getLoginURL(returnTo), '_self'),
    logout: () => window.open(logoutUrl, '_self'),
  };
}

const defaultContext: AuthContextProps = {
  loading: true,
  ...loginManager('/login', '/logout'),
};

// tslint:disable-next-line:variable-name
export const AuthContext = createContext<AuthContextProps>(defaultContext);
export const useAuth = (): AuthContextProps => useContext(AuthContext);

// tslint:disable-next-line:variable-name
export const AuthProvider: FC = ({ children }) => {
  const { result, error, loading } = useAsync<AuthState>(async () => {
    const req = await fetch('/whoami', { credentials: 'include' });
    if (!req.ok) {
      throw new Error(`Failed to get /whoami ${req.statusText}`);
    }
    if (req.headers.get('content-type') !== 'application/json') {
      throw new Error(`Failed to GET /whoami JSON data: backend may be missing _handler.js.`);
    }
    return req.json();
  }, []);
  return (
    <AuthContext.Provider value={{ ...defaultContext, loading, error, ...result }}>
      {children}
    </AuthContext.Provider>
  );
};
