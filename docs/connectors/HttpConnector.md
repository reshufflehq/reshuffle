## HTTP Connector

Handle HTTP requests.

_Events_:

[request](#request) Handle HTTP request

### Event Details

#### <a name="request"></a>Request event

_Event parameters:_

```
method: string - HTTP request method
path: string - URL path prefix
```

_Handler inputs:_

```
event.req: object - Express request object
event.res: object - Express response object
```

_Example:_

```js
async (event) => {
  event.res.status(200).send('Ok');
}
```

Create API endpoint by handling HTTP requests. This event can
be used to create REST or other types of HTTP based APIs.

The handler function is an Express framework handler. It receives
standard Express request and response object. The response object
is also used to formulate the HTTP response to the caller.
