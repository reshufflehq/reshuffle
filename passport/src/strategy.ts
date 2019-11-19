import { Strategy as StrategyType } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as Auth0Strategy } from 'passport-auth0';
import { Profile } from '@reshuffle/auth';
import { titlecase } from 'stringcase';
import { stickFigure } from './stick-figure';

function getMissingOauthEnvariables() {
  return ['OAUTH_DOMAIN', 'OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET']
    .filter((key) => !process.env[key]);
}

function validateEnv() {
  const missing = getMissingOauthEnvariables();
  if (missing.length > 0) {
    throw new Error(`Cannot instantiate OAuth strategy without environment variables ${missing.join(', ')}`);
  }
}

function verifyUser(
  _accessToken: string,
  _refreshToken: string,
  _extraParams: any,
  profile: Profile,
  done: (error: any, user?: any, info?: any) => void,
) {
  // _extraParams.id_token has a JWT, if needed.
  const { id, displayName, emails, picture } = profile;
  return done(null, { provider: 'auth0', id, displayName, emails, picture });
}

function fakeVerifyUser(
  username: string, _password: string, done: (error: any, user?: Profile | false) => void
) {
  if (username.startsWith('error')) return done(`Error ${username}`);
  if (username.startsWith('fail')) return done(null, false);
  return done(null, {
    provider: 'local fake',
    id: username,
    displayName: titlecase(username),
    emails: [{ value: `${username}@example.com` }],
    picture: stickFigure,
  });
}

class FakeLocalStrategy extends LocalStrategy {
  public readonly fake: boolean = true;

  // Just inherit the constructor from LocalStrategy.
}

export function makeStrategy(): Auth0Strategy | FakeLocalStrategy {
  if (process.env.NODE_ENV === 'production' || process.env.OAUTH_CLIENT_ID) {
    validateEnv();
    const baseUrl = process.env.RESHUFFLE_APPLICATION_DOMAINS!.split(',')[0];
    return new Auth0Strategy({
      clientID: process.env.OAUTH_CLIENT_ID!,
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
      domain: process.env.OAUTH_DOMAIN!,
      callbackURL: `https://${baseUrl}/callback`,
    }, verifyUser);
  }

  return new FakeLocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
  }, fakeVerifyUser);
}

export function isFake(strategy: StrategyType): strategy is FakeLocalStrategy {
  return (strategy as any).fake;
}

export default makeStrategy;
