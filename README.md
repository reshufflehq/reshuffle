# Reshuffle Integration Framework
Reshuffle is a lightweight and open source integration framework. With Reshuffle you can build integrations, connect systems, and build workflows.

Here is a simple workflow that listens to a cron event that runs every 5 sec: 
```js
const {Reshuffle, CronService} = require('reshuffle');
const app = new Reshuffle();
const cronService = new CronService();

app.register(cronService);

app.when(cronService.on({'interval':5000}), (event) => {
  console.log('Hello World!')
});

app.start();
```

## Basic concepts
### Reactive Programming
At its core Reshuffle is an event-based engine. Very similar to programming with a web server, you just need to define a function that will be called when an event is triggered.

Events can be anything from a file change, S3 bucket update, a cron job timer, your own custom event, or even an HTTP call.

Here is an example of listening to a HTTP get event on /test, using the HTTP service:

```js
const {Reshuffle, HttpService} = require('reshuffle');
const app = new Reshuffle();
const httpService = new HttpService();

app.register(httpService);

app.when(httpService.on({'method':'GET','path':'/test'}), (event) => {
  event.res.end("Hello World!");
});

app.start(8000);
```
A service *on({eventOptions})* method is kinda smart, and enables short-handing, so:
```js
app.when(httpService.on({'method':'GET','path':'/test'}), (event) => {
  event.res.end("Hello World!");
});
```
Is syntactically equivalent to: 
```js
httpService.on({'method':'GET','path':'/test'}).do((event) => {
    event.res.end("Hello World!");
});

```
Note: Remember to add the *app.register(service)* prior to *when(...)* or *on(...)*. 

More examples can be found here [TBD]

### Easy services configuration 
A critical aspect of building integrations is configuring how to connect to different services we want to integrate with. With Reshuffle you can easily configure *Service* objects and inject them.

Let's expend the example above and send a message to a Slack, every time someone triggers the 'HTTP/GET/test' event:

```js
const {Reshuffle, HttpService, SlackService} = require('reshuffle')
const app = new Reshuffle();

const connectionOptions = {
  'APIToken':process.env.SLACK_AUTH_KEY,
  'team':'ourTeam',
};

const httpService = new HttpService();
app.register(httpService);

// the 2nd parameter is used to identify the service later on
const slackService = new SlackService(connectionOptions, 'services/Slack');
app.register(slackService);

app.when(httpService.on({'method':'GET','path':'/test'}), (event) => {
  event.getService('services/Slack')
    .send('Somebody called this event!', '#reports');
})

app.start();
```
Service objects expose the API and Events that the external service (from a DB to an ERP) provides. You can specify an id when you register a service to the app with the *register(service)*, providing a identifier in the service constructor, and then access that service using the *getService(serviceId)* method. 

You noticed in the code sample that we provided important information on how to connect to the 3rd party system (in that case, Slack). *Services* are an easy way to separate the connection configuration from your code, configure a connection to a service once and use it anywhere. 

You can use the Service object to take action on a remote service (such as adding a row to a CRM) and configure events that trigger when something happens in that system. We will show you how to do that in the next section. 

A full list of Services, and how to create your own Service, can be found here [TBD]

### Events
As we saw, services are basically adapters that connect external systems, such as Slack, Database, CRM, or any other system. Services can be configured to emit a Reshuffle event, when a preconfigured thing happens in these systems. 
 
Here is how you would configure a SlackService to listen to a message from Slack:
```js
const {Reshuffle, SlackService} = require('reshuffle');
const app = new Reshuffle();

const connectionOptions = {
  'APIToken':process.env.SLACK_AUTH_KEY,
  'team':'ourTeam',
};

const slackService = new SlackService(connectionOptions, 'services/Slack');
app.register(slackService);

const eventOptions = {
  'event_type':'new_message',
  'channel':'C6646754636',
  'type':'new_message'
  };

app.when(slackService.on(eventOptions), (event) => {
  event.getService('services/Slack').reply('Thank you for your message!');
})

app.start();
```
It is the responsibility of the SlackService to listen to the events in Slack and emit corresponding events in Reshuffle. Your code can listen to these events and run business logic.

As you can see, both the event creation and the business logic, use the same Service configuration. This makes configuration easier to manage.

 A full list of events, and how to create your own event, can be found here [TBD]


## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 0.10 or higher is required.

If this is a brand new project, make sure to create a `package.json` first with
the [`npm init` command](https://docs.npmjs.com/creating-a-package-json-file).

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install reshuffle
```

## Features

  * Simple Express-style event handling 
  * Focus on high performance
  * Separation of configuration and execution
  * Connects out of the box with many SAAS services
  * Highly extendable

## Quick Start

  
  Install the engine

```bash
$ npm install -g reshuffle
```

Copy the `helloWorldHTTPExample.js` example from the example folder into your /tmp/foo.

Install dependencies:

```bash
$ npm install
```

```bash
$ node helloWorldHTTPExample
```

got to http://localhost:8000/test


## Examples
Examples can be found in the /examples folder
