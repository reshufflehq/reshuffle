import { makeStrategy, isFake } from './strategy';

import express from 'express';
import session from 'cookie-session';
import passport from 'passport';
import bodyParser from 'body-parser';

const strategy = makeStrategy();

passport.use(strategy);

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

function onCallback(req: express.Request, res: express.Response, next: (err: any) => void) {
  passport.authenticate('auth0', (err, user, _info) => {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, (loginErr) => {
      if (err) { return next(loginErr); }
      res.redirect(req.session?.returnTo || '/');
      delete req.session?.returnTo;
    });
  })(req, res, next);
}

const oauthPage: express.Handler[] = [
  passport.authenticate('auth0', { scope: 'openid email profile' }),
  (_req, res) => res.redirect('/'),
];

// TODO(ariels): Support secret rotation.
const sessionSecretKey = process.env.RESHUFFLE_SESSION_SECRET || 'fancy crab';

export function authRouter(): express.Express {
  const app = express();
  const sessionOpt: CookieSessionInterfaces.CookieSessionOptions = {
    keys: [sessionSecretKey],
    sameSite: 'lax',
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    sessionOpt.secure = true;
  }
  app.use(session(sessionOpt));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/whoami', (req, res) => {
    if (req.session?.passport?.user) {
      return res.json({ authenticated: true, profile: req.session.passport.user });
    }
    return res.json({ authenticated: false });
  });

  // A fake login page for the local server.
  app.get('/login', isFake(strategy) ? fakeLoginPage : oauthPage);

  if (isFake(strategy)) {
    app.post(
      '/login',
      bodyParser.urlencoded({ extended: true }),
      passport.authenticate('local', { failureRedirect: '/login' }),
      (req, res) => {
        res.redirect(req.session?.returnTo || '/');
        delete req.session?.returnTo;
      }
    );
  }

  if (!isFake(strategy)) {
    app.get('/callback', onCallback);
  }

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  return app;
}

export default authRouter;
