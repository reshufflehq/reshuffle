import { makeStrategy, makeFakeLocalStrategy, isFake } from './strategy';

import express from 'express';
import session from 'cookie-session';
import passport from 'passport';
import bodyParser from 'body-parser';
import { URLSearchParams } from 'url';

function makeStrategies() {
  if (process.env.NODE_ENV === 'production' || process.env.OAUTH_CLIENT_ID) {
    const domains = process.env.RESHUFFLE_APPLICATION_DOMAINS!.split(',');
    return domains.map((d) => ({ domain: d, strategy: makeStrategy(d) }));
  }
  return [{ domain: '*', strategy: makeFakeLocalStrategy() }];
}

const strategies = makeStrategies();
for (const { domain, strategy } of strategies) {
  passport.use(isFake(strategy) ? 'fake' : `auth0-${domain}`, strategy);
}

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

function fakeLoginPage(req: express.Request, res: express.Response) {
  if (req.session) {
    req.session.returnTo = req.query.returnTo || '/';
  }
  return res.header('content-type', 'text/html')
    .end(`
<!doctype html>
<html lang="en">
  <head>
    <title>Mock Login Page</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="https://fonts.googleapis.com/css?family=IBM+Plex+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
    <style>
body {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
form {
  margin-top: 2em;
  margin-left: 2em;
  margin-right: 2em;
}
.card {
  -webkit-box-shadow: 0px 8px 12px 5px rgba(0,0,0,0.35);
  -moz-box-shadow: 0px 8px 12px 5px rgba(0,0,0,0.35);
  box-shadow: 0px 8px 12px 5px rgba(0,0,0,0.35);
}
.card-title {
  text-align: center;
}
.reshuffle {
  font-family: 'IBM Plex Mono', monospace;
  color: #0FC069;
}
.reshuffle .caret {
  color: black;
}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="card-body">
        <h3 class="card-title"><span class="reshuffle">re<span class="caret">^</span>shuffle</span></h3>
        <h6 class="card-subtitle text-muted">Mock login page for the local dev environment</h6>
        <form action="/login" method="post">
          <div class="form-group row">
            <input type="text" required class="form-control" name="username" placeholder="Username">
          </div>
          <input type="hidden" required class="form-control" name="password" placeholder="Password" value="password">
          <div class="form-group row">
            <button type="submit" class="btn btn-dark btn-block">Log in</button>
          </div>
        </form>
      </div>
    </div>
  </body>
</html>
`);
}

// A poor man's vhost module - calls handler if the hostname matches
function ifMatch(domain: string, handler: express.Handler): express.Handler {
  return (req, res, next) => {
    if (domain === '*' || domain === req.hostname) {
      return handler(req, res, next);
    }
    next();
  };
}

function createOnCallback(domain: string): express.Handler {
  return (req, res, next) => {
    passport.authenticate(`auth0-${domain}`, (err, user, _info, _extra) => {
      if (err) { return next(err); }
      // TODO: redirecting to /login, a misconfiguration causes a confusing redirect loop
      if (!user) { return res.redirect('/login'); }
      req.logIn(user, (loginErr) => {
        // loginErr usually indicates a failure to serialize when using a session store
        if (loginErr) { return next(loginErr); }
        res.redirect(req.session?.returnTo || '/');
        delete req.session?.returnTo;
      });
    })(req, res, next);
  };
}

function createOAuthRouter(domain: string) {
  // using Router and not an appp to avoid duplicating app.set-s
  const router = express.Router();
  router.use(
    (req, _res, next) => {
      if (req.session) {
        req.session.returnTo = req.query.returnTo || '/';
      }
      next();
    },
    passport.authenticate(`auth0-${domain}`, { scope: 'openid email profile' }),
    (_req, res) => res.redirect('/'),
  );
  return router;
}

function createLogout(domain: string): express.Handler {
  return (req, res) => {
      req.logout();
      const oauthDomain = process.env.OAUTH_DOMAIN!;
      const clientId = process.env.OAUTH_CLIENT_ID!;
      const params = new URLSearchParams({
        returnTo: `https://${domain}`,
        client_id: clientId,
      }).toString();
      res.redirect(`https://${oauthDomain}/v2/logout?${params}`);
    };
}

function createPerDomainAuth(domain: string, strategy: passport.Strategy) {
  const router = express.Router();
  router.get('/whoami', (req, res) => {
    if (req.session?.passport?.user) {
      return res.json({ authenticated: true, profile: req.session.passport.user });
    }
    return res.json({ authenticated: false });
  });
  // A fake login page for the local server.
  router.get('/login', isFake(strategy) ? fakeLoginPage : createOAuthRouter(domain));
  if (isFake(strategy)) {
    router.post(
      '/login',
      bodyParser.urlencoded({ extended: true }),
      passport.authenticate('fake', { failureRedirect: '/login' }),
      (req, res) => {
        res.redirect(req.session?.returnTo || '/');
        delete req.session?.returnTo;
      }
    );
  }
  router.all('/logged-in', (_req, res) => {
    return res.header('content-type', 'text/html')
      .end(`
  <!doctype html>
  <html lang="en">
    <head>
      <title>Redirect page</title>
      <meta charset="utf-8">
    </head>
    <body>
      <script>
        window.localStorage.setItem('__reshuffle__login', new Date().toISOString());
        window.close();
      </script>
    </body>
  </html>
    `);
  });
  if (!isFake(strategy)) {
    router.get('/callback', createOnCallback(domain));
  }
  if (isFake(strategy)) {
    router.get('/logout', (req, res) => {
      req.logout();
      res.redirect('/');
    });
  } else {
    router.get('/logout', createLogout(domain));
  }
  return router;
}

// TODO(ariels): Support secret rotation.
const sessionSecretKey = process.env.RESHUFFLE_SESSION_SECRET || 'fancy crab';

export function createAuthHandler(): express.Express {
  const app = express();
  const sessionOpt: CookieSessionInterfaces.CookieSessionOptions = {
    keys: [sessionSecretKey],
    name: 'reshuffle_session',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
  };

  if (process.env.RESHUFFLE_SESSION_SAME_SITE === 'none') {
    // Not setting anything yet until the following issue is resolved.
    // https://github.com/expressjs/cookie-session/issues/131
  } else if (process.env.RESHUFFLE_SESSION_SAME_SITE === undefined
    || process.env.RESHUFFLE_SESSION_SAME_SITE === 'lax') {
    sessionOpt.sameSite = 'lax';
  } else if (process.env.RESHUFFLE_SESSION_SAME_SITE === 'strict') {
    sessionOpt.sameSite = 'strict';
  } else {
    // tslint:disable-next-line:no-console
    console.error(
      'Invalid value for RESHUFFLE_SESSION_SAME_SITE, should be one of (lax, strict, none), defaulting to lax');
    sessionOpt.sameSite = 'lax';
  }
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    sessionOpt.secure = true;
  }
  app.use(session(sessionOpt));

  // Auto extend session every minute
  // https://github.com/expressjs/cookie-session#extending-the-session-expiration
  app.use((req, _res, next) => {
    if (req.session) {
      req.session.nowInMinutes = Math.floor(Date.now() / 60e3);
    }
    next();
  });
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(passport.initialize());
  app.use(passport.session());
  for (const { strategy, domain } of strategies) {
    app.use(ifMatch(domain, createPerDomainAuth(domain, strategy)));
  }

  return app;
}

export default createAuthHandler;
