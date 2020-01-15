## `@reshuffle/passport`

"out-of-the-box" auth for your app.

Meant to be paired with [`@reshuffle/react-auth`](../react-auth).

See a fully working demo [here](https://github.com/reshufflehq/auth-template).

### Installation
```console
$ npm install @reshuffle/passport
```

### Usage
Configure `backend/_handler.js`

```js
const app = express();
app.use('/', authRouter());

// Custom routes go here

app.use(defaultHandler);

export default app;
```

Add custom routes

```js
app.get('/display-name', (req, res) => {
  if (!req.user) {
    return res.sendStatus(403);
  }
  res.end(req.user.displayName);
});
```

Access user from your `@expose`d functions

`backend/todos.js`
```js
import { getCurrentUser } from '@reshuffle/server-function';
import { get } from '@reshuffle/db';

/* @expose */
export async function getTodos() {
  const user = getCurrentUser(true /* required - will throw an error if not authenticated */);
  return get(`/todos/${user.id}`);
});
```

### Error handling

If a login fails due to some reason (e.g. misconfiguration of the login provider) the user will be redirected to /login-error.

A login-error page is not provided, for example if using in a React app with a react-router the page should be handled by a

```jsx
<Route exact path='/login-error'>
```

### Advanced Configuration

When using with the reshuffle platform an OAuth provider will be configured. If
you wish to use an alternative oauth implementation you can override the
following environment variables:

- `OAUTH_DOMAIN` \
  Domain of the OAuth provider (e.g. `oauth.example`)
- `OAUTH_CLIENT_SECRET` \
  The Client Secret received from the OAuth provider
- `OAUTH_CLIENT_ID` \
  The Client ID received from the OAuth provider
- `RESHUFFLE_APPLICATION_DOMAINS` \
  Comma separated list of the domains your applications is going to run (e.g. `a.domain.example,www.domain.example`)
