import React, { FC, createContext, useContext } from 'react';
import { useAsync } from 'react-async-hook';

// Copied from @types/passport/index.d.ts
export interface Profile {
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

interface AuthContextProps {
  state: AuthState;
  loginManager: LoginManager;
}

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
  state: { loading: true },
  loginManager: loginManager('/login', '/logout'),
};

// tslint:disable-next-line:variable-name
const AuthContext = createContext<AuthContextProps>(defaultContext);

export const useAuth = (): AuthState => useContext(AuthContext).state;
export const useAuthFlow = (): LoginManager => useContext(AuthContext).loginManager;

// tslint:disable-next-line:variable-name
export const AuthProvider: FC = ({ children }) => {
  const { result, error, loading } = useAsync<AuthState>(async () => {
    const req = await fetch('/whoami', { credentials: 'include' });
    if (!req.ok) {
      throw new Error(`Failed to get /whoami ${req.statusText}`);
    }
    return req.json();
  }, []);
  return (
    <AuthContext.Provider value={{ ...defaultContext, state: { loading, error, ...result } }}>
      {children}
    </AuthContext.Provider>
  );
};
