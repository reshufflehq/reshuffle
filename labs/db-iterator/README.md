# Reshuffle DB Iterator

Iterate over potentially large Reshuffle DB query results

## When to use it

The `find` method of [Reshuffle DB][reshuffle-db] can return an unlimited amount of
data in a single array unless you use the `limit` option.  If it is
a lot of data you can obviously might into any of these problems:

* Query timeouts
* Backend must read *all* the data before it can *start* processing
  _any_ data.
* Backend might run out of memory.

`db-iterator` presents large results using an [async
iterable][async-iterable] -- an ES2018 feature.

## Installation

```sh
npm install --save @reshuffle/labs-db-iterator
```

## Usage

In your backend:

### JavaScript

```js
const iterateFind = require('@reshuffle/labs-db-iterator');

// ...

async function numCopiesOfBooks() {
  const query = Q.key.startsWith('user:');
  const ret = {};
  for await (const user of iterateFind(Q.filter(query))) {
    for (const book of user.books) {
      ret[book.title] = (ret[book.title] || 0) + 1;
    }
  }
  return ret;
}
```

### TypeScript

```ts
import iterateFind from '@reshuffle/labs-db-iterator';

// ...

async function numCopiesOfBooks(): { [title: string]: number } {
  const query = Q.key.startsWith('user:');
  const ret: { [title: string]: number } = {};
  for await (const user of iterateFind(Q.filter(query))) {
    for (const book of user.books) {
      ret[book.title] = (ret[book.title] || 0) + 1;
    }
  }
  return ret;
}
```

## API

Instead of calling [`find`][reshuffle-db-find], call
`iterateFind(query, iteratorProps?, db?)`.  It returns an async
iterable, suitable for "for-await-of" statements.

Parameters:
* `query`: Query to run.  If the query already includes a `limit`,
  make sure to pass a smaller `chunkSize`.
* `iteratorProps`: If specified, controls these properties of the
  iterator:
  - `chunkSize`: Number of documents to return in each query to
    Reshuffle DB.  When returning very large documents you may need to
    reduce this.
* `db`: If specified, uses a non-default DB client.

## Limitations

* *Non-atomicity*.  This version does not (yet) support iterating over
  a snapshot of data.  So items added during iteration might not
  appear, or might even cause some items to appear twice.  Please
  [contact us](support@reshuffle.com) if you require this
  functionality

## What are Reshuffle labs?

This Reshuffle package is not yet ready for the prime time.  It's a
sneak peek at something we're working on, to let you gain experience
with it.  Please let us know if you intend to use this feature, and of
course request changes would make it more useful to you.

This is a lab, so everything here is experimental!  Obviously we want
to release these packages, and we probably will.  But _*all details are
subject to change*_.

Have fun, and [let us know](support@reshuffle.com)!


[async-iterable] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
[reshuffle-db] https://dev-docs.reshuffle.com/
[reshuffle-db-find] https://dev-docs.reshuffle.com/modules/_index_.html#find
