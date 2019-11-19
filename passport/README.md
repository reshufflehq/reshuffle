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
