import { makeStrategy, isFake } from './strategy';

import express = require('express');
import session = require('express-session');
import passport = require('passport');
import bodyParser = require('body-parser');

import { URL } from 'url';
import * as querystring from 'querystring';

const strategy = makeStrategy();

passport.use(
  makeStrategy(),
);

passport.serializeUser(function(user, cb) {
  cb(null, JSON.stringify(user));
});

passport.deserializeUser<passport.Profile, string>(function(stringified, cb) {
  cb(null, JSON.parse(stringified));
});

function fakeLoginPage(req: express.Request, res: express.Response) {
  req.session.returnTo = req.query.returnTo || '/';
  return res.end(`
<html>
<head>
    <title>Fake Login Page</title>
  </head>
  <body>
    <form action="/login" method="post">
      <div>
        <label for="username">Username:</label><input name="username" autofocus />
      </div>
      <div>
        <label for="password">Password:</label><input name="password" type="password" />
      </div>
      <div>
        <input type="submit" value="Submit" />
      </div>
    </form>
  </body>
</html>
`);
}

function onCallback(req: express.Request, res: express.Response, next: (err: any) => void) {
  passport.authenticate('auth0', function (err, user, _info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/user');
    });
  })(req, res, next);
}

function makeReturnTo(req: express.Request): URL {
  const ret = new URL('http://example.com/');
  ret.protocol = req.protocol;
  ret.hostname = req.hostname;
  ret.port = req.connection.localPort.toString();
  return ret;
}

// Logs out of session and redirects to homepage
function onLogout(req: express.Request, res: express.Response) {
  req.logout();

  const logoutURL = new URL(`https://${process.env.OAUTH_DOMAIN}/v2/logout`);
  var searchString = querystring.stringify({
    client_id: process.env.OAUTH_CLIENT_ID,
    returnTo: makeReturnTo(req).toString(),
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL.toString());
}

const oauthPage: express.Handler[] = [
  passport.authenticate('auth0', { scope: 'openid email profile' }),
  (_req, res) => res.redirect("/"),
];

// BUG: Use a remote shared per-app secret.
// TODO(ariels): Support secret rotation.
const sessionSecretKey = process.env.SESSION_SECRET || 'fancy crab';

export function mw(): express.IRouter {
  const router = express.Router();
  router.use(session({ secret: sessionSecretKey, resave: false, saveUninitialized: false }));
  router.use(passport.initialize());
  router.use(passport.session());

  router.post('/login',
           bodyParser.urlencoded({ extended: true }),
           passport.authenticate('local', { failureRedirect: '/login' }),
           (req, res) => {
             res.redirect(req.session.returnTo || '/');
             delete req.session.returnTo;
           }
          );

  // A fake login page for the local server.
  router.get('/login', isFake(strategy) ? fakeLoginPage : oauthPage);

  if (!isFake(strategy)) {
    router.get('/callback', onCallback);
  }

  router.get('/logout', onLogout);

  return router;
}

export default mw;
