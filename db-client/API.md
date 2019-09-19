# Reshuffle DB client API

Reshuffle includes a simple key-value store.  To use it,
```js
const db = require('@reshuffle/db');

function readCounter(key) { return db.get(`counter:${key}`); }
function incrementCounter(key) { return db.update(`counter:${key}`, (n) => (n || 0) + 1); }
```
Note all `db` calls are asynchronous; you should `await` their result.

## Useful methods

## On `db`

`db` contains all entrypoints.  Use [top-level
methods](modules/_index_.html), e.g. `db.get`, to perform actions on
keys.

## Queries

To use `db.find`, build queries using
[`db.Q.filter`](modules/_query_.html#filter-1), or combine smaller
queries with [`db.Q.all`](modules/_query_.html#all) and
[`db.Q.any`](modules/_query_.html#any).

TODO(ariels): Make that object actually show up!
