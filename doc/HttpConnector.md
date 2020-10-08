*NPM Package:*  [reshuffle](https://www.npmjs.com/package/reshuffle)

The HTTP connector is a wrapper to a web server (Express under the hood) it lets developers trigger logic when an HTTP endpoint is hit. 

The HTTP Connector is not a full replacement for Express. If you are building a pure web application, 
without any integration requirements, then using pure Express might be a better decision. The HTTP connector and Reshuffle are a good fit when  but if you are building an integrating system that needs HTTP integration then this connector will do the job.  
building integrated flows that need to interact with other systems over HTTP.

The following example exposes an endpoint that changes your status in Slack:
```js
const { HttpConnector, Reshuffle } = require('reshuffle')
const { SlackConnector } = require('reshuffle-slack-connector')

const app = new Reshuffle()
const httpConnector = new HttpConnector(app)
const slackConnector = new SlackConnector(
  app,
  {
    authkey: process.env.SLACK_AUTH_KEY,
  },
  'connectors/Slack',
)

httpConnector.on(
  {
    method: 'GET',
    path: '/status',
  },
  (event, app) => {
    app.getConnector('connectors/Slack').setStatus('U8675636646', event.req.query.slack_status)
  },
)

app.start()
```

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
event.ctx.req: object - Express request object
event.ctx.res: object - Express response object
```

_Example:_

```js
async (event, app) => {
  event.res.status(200).send('Ok')
}
```

Create API endpoint by handling HTTP requests. This event can
be used to create REST or other types of HTTP based APIs.

The handler function is an Express framework handler. It receives
standard Express request and response object. The response object
is also used to formulate the HTTP response to the caller.
