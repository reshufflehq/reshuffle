# AWS S3 Connector

This connector can be used to manage AWS S3 buckets and objects. Full
details on the S3 API can be found
[here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html).

All actions throw in case of an error.

_Events_:

[bucketInitialized](#bucketInitialized) Bucket traching initialized

[bucketChanged](#bucketChanged) Bucket content changes

[objectAdded](#objectAdded) Object added to bucket

[objectModified](#objectModified) Object modified in bucket

[objectRemoved](#objectRemoved) Object removed from bucket

_Actions_:

[listBuckets](#listBuckets) Get a list of bucket info objects

[listBucketNames](#listBucketNames) Get a list of bucket names

[createBucket](#createBucket) Create a new bucket

[deleteBucket](#deleteBucket) Delete a bucket

[listObjects](#listObjects) Get a list of object info objects

[listObjectKeys](#listObjectKeys) Get a list of object keys

[copyObject](#copyObject) Create a copy of an existing object

[deleteObject](#deleteObject) Delete an object

[getObject](#getObject) Get the contents of an object

[putObject](#putObject) Create a new object

[getSignedURL](#getSignedURL) Get a signed URL for a single operation

[getSignedObjectGetURL](#getSignedObjectGetURL) Get a signed download URL

[getSignedObjectPutURL](#getSignedObjectPutURL) Get a signed upload URL

_SDK_:

[sdk](#sdk) Get direct SDK access

## Event Details

### <a name="bucketInitialized"></a>Bucket Initialized event

_Example:_

```js
async (objects) => {
  console.log(objects);
}
```

This event is fired when the connector starts tracking a specific S3
bucket. More technically, it is fired when the connector first reads
the content of an S3 bucket and does not have a previous record of its
object in its internal database.

For example, if a set of scripts is used to synchronize the contents of
one bucket to another, this event can be used to read the contents of the
target bucket and copy over the missing objects. This prevents the need to
copy over every object in case of a database failure.

When this event is fired, neither the [bucketChanged](#bucketChanged)
event nor the individual [objectAdded](#objectAdded) events are fired for
the same objects. Subsequent additions or modification to the tracked
bucket will generate those events.

### <a name="bucketChanged"></a>Bucket Changed event

_Event parameters:_

```
bucket: string - S3 bucket name
```

_Handler inputs:_

```
objects: object - Bucket state
```

_Example:_

```js
async (objects) => {
  console.log('All keys:', Object.keys(objects).join(', '));
}
```

This event is triggered when one or more of the objects in an S3 buckets
change: a new object is created, the content of an existing object is
modified or an object is removed.

This event consolidates multiple changes. For each of this changes, the
appropriate `objectAdded`, `objectModified` or `objectRemoved` is also
fired. Those events are fired one per each object changed.

The `objects` argument has the following format:

```ts
{
  'key 1': {
    key: string, // equals to 'key 1' in this case
    lastModified: Date,
    eTag: '"..."' // 32 character hex string
    size: number // In bytes
  },
  'key 2': { ... },
  ...
}
```

### <a name="objectAdded"></a>Object Added event

_Event parameters:_

```
bucket: string - S3 bucket name
```

_Handler inputs:_

```
object: object - Object info
```

_Example:_

```js
async (object) => {
  console.log('New object added:');
  console.log('  Key:', object.key);
  console.log('  Modified:', object.lastModified);
  console.log('  eTag:', object.eTag);
  console.log('  Size:', object.size, 'bytes');
}
```

This event is triggered once for each new object added to the bucket.

The `object` info argument has the following format:

```ts
{
  key: string,
  lastModified: Date,
  eTag: '"..."' // 32 character hex string
  size: number // Size in bytes
}
```

### <a name="objectModified"></a>Object Modified event

_Event parameters:_

```
bucket: string - S3 bucket name
```

_Handler inputs:_

```
object: object - Object info
```

_Example:_

```js
async (object) => {
  console.log('New object added:');
  console.log('  Key:', object.key);
  console.log('  Modified:', object.lastModified);
  console.log('  eTag:', object.eTag);
  console.log('  Size:', object.size, 'bytes');
}
```

This event is triggered once whenever the content of an object in the
bucket is modified.

The `object` info argument has the following format:

```ts
{
  key: string,
  lastModified: Date,
  eTag: '"..."' // 32 character hex string
  size: number // Size in bytes
}
```

### <a name="objectRemoved"></a>Object Removed event

_Event parameters:_

```
bucket: string - S3 bucket name
```

_Handler inputs:_

```
object: object - Object info
```

_Example:_

```js
async (object) => {
  console.log('New object added:');
  console.log('  Key:', object.key);
  console.log('  Modified:', object.lastModified);
  console.log('  eTag:', object.eTag);
  console.log('  Size:', object.size, 'bytes');
}
```

This event is triggered once whenever an object is removed from
the bucket.

The `object` info argument has the following format:

```ts
{
  key: string,
  lastModified: Date,
  eTag: '"..."' // 32 character hex string
  size: number // Size in bytes
}
```

## Action Details

### <a name="listBuckets"></a>List Buckets action

_Definition:_

```ts
() => object[]
```

_Usage:_

```js
const buckets = await S3.listBuckets();
```

Get a list of
[bucket information objects](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listBuckets-property)
for accessible buckets.

### <a name="listBucketNames"></a>List Bucket Names action

_Definition:_

```ts
() => string[]
```

_Usage:_

```js
const names = await S3.listBucketNames();
```

Get a list of accessible bucket names.

### <a name="createBucket"></a>Create Bucket action

_Definition:_

```ts
(
  bucket: string,
  region?: string,
) => void
```

_Usage:_

```js
await S3.createBucket('my-bucket-name', 'us-west-1');
```

Create a new bucket.

### <a name="deleteBucket"></a>Delete Bucket action

_Definition:_

```ts
(
  bucket: string,
) => void
```

_Usage:_

```js
await S3.deleteBucket('my-bucket-name');
```

Delete a bucket.

### <a name="listObjects"></a>List Objects action

_Definition:_

```ts
(
  bucket: string,
) => object[]
```

_Usage:_

```js
const objects = await S3.listObjects('my-bucket-name');
```

Get a list of
[object information objects](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property)
for objects in the specified bucket.

### <a name="listObjectKeys"></a>List Object Keys action

_Definition:_

```ts
(
  bucket: string,
) => string[]
```

_Usage:_

```js
const keys = await S3.listObjectKeys();
```

Get a list of object keys in the specified bucket.

### <a name="copyObject"></a>Copy Object action

_Definition:_

```ts
(
  sourceBucket: string,
  sourceKey: string,
  targetBucket: string,
  targetKey: string,
) => object
```

_Usage:_

```js
const result = await S3.copyObject(
  'old-bucket',
  'original.jpg',
  'new-bucket',
  'copy.jpg',
);
```

Create a new copy of an existing object. Returns a
[copy result](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#copyObject-property).

### <a name="deleteObject"></a>Delete Object action

_Definition:_

```ts
(
  bucket: string,
  key: string,
) => void
```

_Usage:_

```js
await S3.deleteObject('my-bucket-name', 'no-longer-needed.txt');
```

Delete an object from the specified bucket.

### <a name="getObject"></a>Get Object action

_Definition:_

```ts
(
  bucket: string,
  key: string,
) => object
```

_Usage:_

```js
const info = await S3.getObject('my-bucket-name', 'image.png');
```

Get information about an object, including its contents, as defined
[here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property).

### <a name="putObject"></a>Put Object action

_Definition:_

```ts
(
  bucket: string,
  key: string,
  buffer: Buffer,
) => object
```

_Usage:_

```js
const info = await S3.putObject(
  'my-bucket-name',
  'hello.txt',
  Buffer.from('Hello, world!'),
);
```

Returns information about the new object, as defined
[here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property).

### <a name="getSignedURL"></a>Get Signed URL action

_Definition:_

```ts
(
  operation: string,
  key: string,
  expires?: number = 60,
) => string
```

_Usage:_

```js
const url = await S3.getSignedURL('getObject', 'me.png');
```

Get a pre-signed URL for a single operation. The URL can be used to
access an object without requiring any credentials.

The URL is valid for a limited time, as specified by `expires` in seconds.

### <a name="getSignedObjectGetURL"></a>Get Signed Object Get URL action

_Definition:_

```ts
(
  key: string,
  expires?: number = 60,
) => string
```

_Usage:_

```js
const url = await S3.getSignedObjectGetURL('me.png');
```

Get a pre-signed URL for downloading an object. The URL can be used to
download the content of an object without requiring any credentials.

The URL is valid for a limited time, as specified by `expires` in seconds.

### <a name="getSignedObjectPutURL"></a>Get Signed Object Put URL action

_Definition:_

```ts
(
  key: string,
  expires?: number = 60,
) => string
```

_Usage:_

```js
const url = await S3.getSignedObjectPutURL('you.png');
```

Get a pre-signed URL for uploading an object. The URL can be used with a PUT
HTTP request to create a new object without requiring any credentials.

The URL is valid for a limited time, as specified by `expires` in seconds.

## SDK Details

### <a name="sdk"></a>SDK action

_Definition:_

```ts
(
  options ?: object,
) => object
```

_Usage:_

```js
const s3 = await S3.sdk();
```

Get the underlying SDK object. You can specify additional options to override
or add to the required fields in the connector's configuration.
