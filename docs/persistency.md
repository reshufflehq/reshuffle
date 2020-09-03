# Reshuffle Datastore

The Reshuffle Datastore is a simple mechanism for managing state in services
and event handlers. It provides a simple key-value inteface and supports
multiple backends for data storage.

Datastore is used by different services to track state in systems they
connect to. For example, the Twitter API offers a stream of tweets generated
by users. The Twitter service uses datastore to track its last read position
in the stream, so as to avoid generating duplicate events for new tweets.
Another example is the AWS S3 service, which uses datastore to track the
contents of various S3 buckets, so that it can fire events when objects are
added or removed from them.

## Configuring Datastore
By default Reshuffle come with a in memory datastore (easy to use for dev and test,
 but not very persistent). You can set a file or a database persistent adapter like this:
```js
const { Pool } = require('pg')
const pool = new Pool();
const persistentStore = new SQLStoreAdapter(pool, "reshuffledb");
app.setPersistentStore(persistentStore);
```

After you set a persistent store, you can access it from any connector using the `app.getPersistentStore()`
method, or in the event handle logic using the `event.getPersistentStore()` method.

A code example of how to use the store can be found [here](https://github.com/reshufflehq/reshuffle/tree/master/examples/hello-world-persistent). 

Remember, if no store adapter in set, the default in-memory implementation is used.

## <a name="usingdatastore"></a>Using Datastore

Datastore provides a simple key-value interface, with a few additions that
make it possible to share data between servers. The following methods are
supported:

* `get` Retrieve a value for a specific key
* `set` Set the value for a specific key
* `update` Atomicalliy rean-modify-write a single key
* `remove` Delete a key from the datastore
* `list` List all keys

Datastore keys are simple JavaScript strings. You can read more about key
naming guidelines [below](#keynamespaces). Datastore values can be any
JSON-serializable JavaScript values, and cannot be `undefined`.

Following is a detailed description of datastore methods:

### Get method

_Definition_:

```ts
datastore.get(key: string) => any|undefined
```

_Usage_:

```js
const myValue = datastore.get('myKey');
```

Retrieve a single value from the datastore. If `key` does not exist in the
datastore, then `get` returns `undefined`.

### Set method

_Definition_:

```ts
datastore.set(key: string, value: any) => any
```

_Usage_:

```js
const myValue = datastore.get('myKey', 'myValue');
```

Set a single value in the datastore. `value` must be JSON-serializable and
cannot be `undefined`. For convenience, `set` returns the same value it
stores to allow chaining.

Note that if you wish to read, modify and write back a value to the datastore,
you should be using `update` instead of the combination of `get` and `set`.
Using this combination is not atomic, and my result in unexpected behavior in
cases Reshuffle is scaled to multiple servers.

### Update method

_Definition_:

```ts
type Updater = (currentValue: any|undefined) => any|undefined
datastore.update(key: string, updater: Updater) => any
```

_Usage_:

```js
const [OldCount, newCount] = datastore.update(
  'myCounter',
  (currentValue) => currentValue + 1,
);
```

Atomically update one value in the datastore. Instead of receiving the value
directly (like `set` does), `update` uses an updater method to calculate
the new value from the current value.

The updater function receives a single argument with the current value
associated with `key`. If the key does not exist in the datastore, the
updater is passed the value of `undefined`. The function then calculates
and returns the new value for the key. If no change is desired, the
function should return `undefined`.

This function can safely be used to read-modify-write values in the datastore.
Behind the scenes it uses locks and transactions to assure consistency, even
if called simultaneously by multiple Reshuffle servers. For example, if the
counter above is updated by two servers at the same time, `update` gurantees
that its value will increase by two (which is not guaranteed if using `get`
followed by a `set`).

The updater fucntion is allowed to perform IO operations, like accessing
remote APIs, while calculating the new value. Note that the datastore will
lock access to the key while the updater is running, so all other operations
on the key will block unil it is finished. Do not use overly lengthy
operations like invoking event handlers from inside the updater function.

### Remove method

_Definition_:

```ts
datastore.remove(key: string) => void
```

_Usage_:

```js
datastore.remove('myKey');
```

Delete `key` from the datastore.

### List method

_Definition_:

```ts
datastore.list() => string[]
```

_Usage_:

```js
for (const key of datastore.list()) {
  console.log(key);
}
```

List all keys in the datastore.

