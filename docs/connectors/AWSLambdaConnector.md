# AWS Lambda Connector

This connector can be used to access AWS Lambda. It is implemented
using Amazon's
[Lambda SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html).

_Events_:

[queueComplete](#queueComplete) Queue processing is complete

_Actions_:

[create](#create) Create a new Lambda function

[delete](#delete) Delete a Lambda function

[enqueue](#enqueue) Process a queue of tasks in Lambda functions

[invoke](#invoke) Execute a Lambda function

_SDK_:

[sdk](#sdk) Get direct SDK access

## Event Details

### <a name="queueComplete"></a>Queue Complete event

_Example:_

```js
async (event) => {
  console.log(event.qid);
  console.log(event.payloads);
  console.log(event.resolutions);
}
```

This event is fired when a processing queue has completed processing all
its payloads. See the [enqueue](#enqueue) action for details.

## Action Details

### <a name="create"></a>Create action

_Definition:_

```ts
(
  functionName: string,
  code: string,
  options: object = {},
) => object
```

_Usage:_

```js
const functionInfo = await AWSLambda.create(
  'toLowerUpperString',
  `
  exports.handler = async (event) => {
    const str = event.str || 'Hello, world!';
    return {
      statusCode: 200,
      body: JSON.stringify({
        lower: str.toLowerCase(),
        upper: str.toUpperCase(),
      }),
    };
  };
  `,
);
```

Create a new Lambda function with the given `functionName` to execute
the specified `code`. The optional `options` object may contain any of
the following fields:

* `roleName` - Role under which the function will run (defaults to `lambda_basic_execution`)
* `memorySize` - Container memory size in MB (defaults to 256)
* `runtime` - Runtime environment (defaults to `nodejs12.x`)

The created function can be invoked using the [invoke](#invoke) action, or
tied to a myriad of AWS supported events.

We note that the AWS SDK provides many more options for creating and
configuring Lambda functions. For example, functions can be deployed
from an S3 zip file, allowing multiple files and dependencies to be
deployed simultaneously. to leverage these capbilities, you can use
the [sdk](#sdk) action to gain direct access to the SDK and use its
[createFunction](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property)
method directly.

### <a name="delete"></a>Delete action

_Definition:_

```ts
(
  functionName: string,
) => void
```

_Usage:_

```js
await AWSLambda.delete('toLowerUpperString');
```

Delete the Lambda function with the name `functionName`.

### <a name="invoke"></a>Invoke action

_Definition:_

```ts
(
  functionName: string,
  payload: any|any[],
  maxConcurrent: number = 100,
) => string
```

_Usage:_

```js
const qid = await AWSLambda.enqueue(
  'toLowerUpperString',
  [
    { str: 'Alpha' },
    { str: 'Beta' },
    { str: 'Gamma' },
  ],
);
```

Asynchronously process a series of tasks with the Lambda function named
`functionName`. The `payload` is an array of elements, each would be passed
in turn as an input to the Lambda function. If `payload` is scalar, only
a single invocation will ensue.

The `maxConcurrent` argument can be used to limit the number of simultaneous
invocaions of the Lambda function, with a hard limit of 100 per queue.
Currently the connector does not enforce a global limit on the number
of functions it invokes through this action.

When all payloads have been processed, the action triggers a
[queueComplete](#queueComplete) event with the queue ID, the payloads array
and a resolutions array in the event object. Each resolution is either the
value returned by the Lambda function or an `Error` object if the invocation
failed.

### <a name="invoke"></a>Invoke action

_Definition:_

```ts
(
  functionName: string,
  requestPayload: any = {},
) => any
```

_Usage:_

```js
const { lower, upper } = await AWSLambda.invoke(
  'toLowerUpperString',
  { str: 'My Awesome String' },
);
```

Invoke the Lambda function with the name `functionName`, passing it the
payload provided in `requestPayload`. The payload can be any JSON
serializable JavaScript object.

The invoke action returns the response payload returned by the Lambda
function. In case of an error during invocation or execution of the
function, this action throws an error.

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
const lambda = await AWSLambda.sdk();
```

Get the underlying SDK object. You can specify additional options to override
or add to the required fields in the connector's configuration.
