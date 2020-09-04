# Reshuffle Connectors
Reshuffle is a framework that lets you connect to services, create integrations between systems, and build workflows using these services and systems. 

Reshuffle achieves this by using **Connectors** as the connection mechanism to a 3rd party service or system. Each system Reshuffle connects to has their own connector. If you want to connect to Salesforce, for example, you would use the Salesforce connector.

Reshuffle ships with an existing ecosystem comprising several connectors you can use to connect to common systems. A list of these Reshuffle-provided connectors can be found in this page, and their code can be found in the various repositories [here](https://github.com/reshufflehq/).  

The framework is extendable, meaning you can create connectors to services you use or even your own proprietary systems. 
The process for building new connectors is described in the [manual](./building-connectors.md). 

## Common Reshuffle Connectors

### Cron Connector
*NPM Package:*  reshuffle

The Cron connector fires events at specified intervals. 
For example, you can use this connector to monitor a system every 10 seconds, or send a daily email report. 
In a single Reshuffle deployment, this connector can use the internal JS Timer, and in distributed setups you can connect it to a Cron service.

Here is an example of how you would send a daily email using this connector:
```js
const {Reshuffle, CronConnector} = require('reshuffle')
const {SMTPConnector} = require('reshuffle-smtp-connector')

const app = new Reshuffle();
const cronConnector = new CronConnector();
const smtpConnector = new SMTPConnector({
  username:'superman',
  password:'hunter123',
  host:'email.some.com',
  port: 587,
  fromName: 'Spiderman II',
  fromEmail: 'admin@superheros.com'
},'connectors/email');

app.register(cronConnector);
app.register(smtpConnector);

app.when(cronConnector.on({'interval':86400000}), (event) => {
  event.getConnector('connectors/email')
    .send({
    to:'email@exmaple.com',
    subject: 'daily report!',
    html: 'The report itself'
    });
});

app.start()
```

#### Connector configuration
The Cron Connector does not require any configuration. 

#### Connector events
##### Interval (default)
This event is emitted every preconfigured interval.
###### Interval Event configuration 
the interval attribute in milliseconds.
```json
{"interval":1000}
```


### HTTP Connector
*NPM Package:*  reshuffle

The HTTP connector is a wrapper to a web server (Express under the hood) it lets developers trigger logic when an HTTP endpoint is hit. 

The HTTP Connector is not a full replacement for Express. If you are building a pure web application, 
without any integration requirements, then using pure Express might be a better decision. The HTTP connector and Reshuffle are a good fit when  but if you are building an integrating system that needs HTTP integration then this connector will do the job.  
building integrated flows that need to interact with other systems over HTTP.

The following example exposes an endpoint that changes your status in Slack:
```js
const {HttpConnector, Reshuffle} = require('reshuffle');
const {SlackConnector} = require('reshuffle-slack-connector'); 

const app = new Reshuffle();
const httpConnector = new HttpConnector();
const slackConnector = new SlackConnector({
  'authkey': process.env.SLACK_AUTH_KEY
}, 'connectors/Slack');

app.register(httpConnector);
app.register(slackConnector);

app.when(httpConnector.on({
  'method':'GET',
  'path':'/status'
}), (event) => {
  event.getConnector('connectors/Slack')
    .setStatus("U8675636646",event.req.query.slack_status); 
});

app.start();
```
The code above creates an HTTP endpoint at `/status`. Sending a `GET` request to this endpoint with the following pattern, sets the 
user status in Slack to the value of the `slack_status` query parameter.
Ergo - hitting `/status?slack_status=happy` will set the user's status to happy.

### SMTP Connector
*NPM Package:*  reshuffle-smtp-connector

The SMTP connector allows a developer to configure a transport that sends emails via SMTP.

The following example exposes an endpoint that changes your status in Slack:
```js
const {HttpConnector, Reshuffle} = require('reshuffle');
const {SMTPConnector} = require('reshuffle-smtp-connector')

const app = new Reshuffle();
const httpConnector = new HttpConnector();
const smtpConnector = new SMTPConnector({
  username:'superman',
  password:'hunter123',
  host:'email.some.com',
  port: 587,
  fromName: 'Spiderman III',
  fromEmail: 'admin@superheros.com'
},'connectors/smtp');

app.register(httpConnector);
app.register(smtpConnector);

app.when(httpConnector.on({
  'method':'GET',
  'path':'/ping'
}), (event) => {
  event.getConnector('connectors/smtp')
    .send({
      to:event.req.query.to,
      subject: 'Ping Email',
      html: 'You have been pinged'
    }); 
});
```
The code above creates an HTTP endpoint at `/ping`. Sending a `GET` request to this endpoint with the following pattern, 
sends an email to the address in the `to` query parameter.

Ergo - hitting `/ping?to=doc@exmaple.com` will send a ping email to `doc@example.com`
