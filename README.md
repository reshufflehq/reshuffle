# Reshuffle Integration Framework
Reshuffle is a lightweight and open source integration framework. With Reshuffle you can build integrations, workflows, and connect systems.

Here is a simple workflow that listens to a cron event that runs every 5 sec:
 
```js
const {Reshuffle, CronConnector} = require('reshuffle');
const app = new Reshuffle();
const cronConnector = new CronConnector(app);


cronConnector.on({'interval':5000}, (event) => {
  console.log('Hello World!')
});

app.start();
```

## Installation
```bash
$ npm install reshuffle
```

For a full step by step tutorial on how to install and use Reshuffle please visit [this page](https://dev.reshuffle.com/docs/getting-started)

## Reshuffle Core Features

- Simple Express-style event handling model
- Separation of configuration and execution
- Connectors to many SAAS services
- Highly extendable
- Focus on high performance

## Basic concepts
### Event Based System
At its core Reshuffle is an event-based engine. Very similar to programming with a web server, you just need to define a function that will be called when an event is triggered.

Events can be anything from a file change, S3 bucket update, a cron job timer, your own custom event, or even an HTTP call.

Here is an example of listening to a HTTP get event on /test, using the HTTP connector:

```js
const {Reshuffle, HttpConnector} = require('reshuffle');
const app = new Reshuffle();
const httpConnector = new HttpConnector(app);


httpConnector.on({'method':'GET','path':'/test'}, (event) => {
  event.context.res.end("Hello World!");
});

```

Connectors act _like_ [node eventEmitter](https://nodejs.org/api/events.html), so when the event is emitted the function is called. We will discuss Connectors in the next section.

More examples [can be found here](https://github.com/reshufflehq/reshuffle/tree/master/examples)

### Reshuffle Connectors 
A critical aspect of building integrations is configuring how to connect to different services we want to integrate with. With Reshuffle you can configure Connector objects and inject them.

Let's expand the example above and send a message to a Slack ‘reports’ channel every time someone triggers the 'HTTP/GET/test' event:

```js
const {Reshuffle, HttpConnector, SlackConnector} = require('reshuffle')
const app = new Reshuffle();

// the httpConnector does not require any config
const httpConnector = new HttpConnector(app);

// configuration for the Slack connection
const slackConnectionOptions = {
  'APIToken':process.env.SLACK_AUTH_KEY,
  'team':'ourTeam',
};
// the 2nd parameter is used to identify the connector later on
const slackConnector = new SlackConnector(app, slackConnectionOptions, 'connectors/Slack');

httpConnector.on({'method':'GET','path':'/test'}, (event) => {
  event.getConnector('connectors/Slack')
    .send('Somebody called this event!', '#reports');
})

app.start();
```
Connector objects expose the API and Events that the external connector (from a DB to an ERP) provides. You can specify a connector id by providing an identifier in the connector constructor, and then access that connector using the `event.getConnector(connectorId)` method.

You noticed in the code sample that we provided important information on how to connect to the 3rd party system (Slack in this case). Connectors are a way to separate the connection configuration from your code, configure a connection to a connector once and use it anywhere.

You can use the Connector object to take action on a remote service (such as adding a row to a CRM) and configure events that trigger when something happens in that system. We will show you how to do that in the next section.

A full list of Connectors, and how to create your own Connector, [can be found here](https://dev.reshuffle.com/docs/connectors)

### Events
As we saw, connectors are basically adapters that connect external systems, such as Slack, Database, CRM, or any other system. 
Connectors can be configured to emit a Reshuffle event, when a preconfigured thing happens in these systems. 
To configure an event, use the `on(eventOptions, handler)` method on the relevant connector.

Here is how you would configure a SlackConnector to listen to a message from Slack:
```js
const {Reshuffle, SlackConnector} = require('reshuffle');
const app = new Reshuffle();

const connectionOptions = {
  'APIToken':process.env.SLACK_AUTH_KEY,
  'team':'ourTeam',
};

const slackConnector = new SlackConnector(app, connectionOptions, 'connectors/Slack');

const eventOptions = {
  'event_type':'new_message',
  'channel':'C6646754636',
  'type':'new_message'
  };

slackConnector.on(eventOptions, (event) => {
  event.getConnector('connectors/Slack').reply('Thank you for your message!');
})

app.start();
```
It is the responsibility of the SlackConnector to listen to the messages in Slack and emit corresponding events in Reshuffle. Your code can listen to these events and run business logic.

As you can see, both the event creation and the business logic, use the same Connector configuration. This makes configuration easier to manage.


## Examples
Examples can be found in the `/examples` [folder](https://github.com/reshufflehq/reshuffle/tree/master/examples)
