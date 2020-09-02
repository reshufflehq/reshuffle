# Reshuffle Connectors
Reshuffle is a framework that lets you connect to services, create integrations between systems, and build workflows using these services and systems. 
Connectors facilitate that connector to a 3rd party service or system -  for example, if you want to connect to Saleforce you would use the Salesforce connector.

Reshuffle comes with several connectors out of the box, to connect to common systems. You can find a list of Reshuffle-provided connectors in this page and the code can be found [here](https://github.com/reshufflehq/).  
The framework is also extendable, and you can create connectors to your own proprietary system. If you want to build your own connector, please follow this [manual]("./buidling-connectors.md"). 

## Common Reshuffle Connectors

### Cron Connector
*NPM Package:*  reshuffle

The Cron connector fires an event at a specified interval. 
For example, you can use this connector to monitor a system every 10 seconds, or send a daily email report. 
In a single Reshuffle deployment, this connecotr can use the internal JS Timer, and in distributed setups you can connect it to a Cron service.

Here is an example of how you would send a daily email using this connector:
```js
const {Reshuffle, CronConnector} = require('reshuffle')
const {EmailConnector} = require('reshuffle-email-connector')

const app = new Reshuffle();
const cronConnector = new CronConnector();
const emailConnector = 
    new EmailConnector({user:'bla',password:'tada',smtp:'email.some.com'},'service/email');

app.register(connector);
app.register(emailConnector);

app.when(connector.on({'interval':86400000}), (event) => {
  event.getConnector('connectors/email')
    .send('daily report!', 'the report itself', ["email@email.com", "email2.."]);
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

The HTTP connector is basically a wrapper to a web server (Express under the hood) it lets developers trigger logic when an HTTP endpoint is hit. 
If you are building a pure web application, without any integration, using pure Express might be a better decision, but if you are building an integrating system that needs HTTP integration then this connector will do the job.  

Here is an example where we expose an endpoint that changes your status in Slack:
```js
const {HttpConnector, Reshuffle} = require('reshuffle');
const {SlackConnector} = require('reshuffle-slack-connector'); 

const app = new Reshuffle();
const httpConnector = new HttpConnector();
const slackConnector = new SlackConnector({'authkey': process.env.SLACK_AUTH_KEY}, 'connectors/Slack');

app.register(httpConnector);
app.register(slackConnector);

app.when(httpConnector.on({'method':'GET','path':'/status'}), (event) => {
  event.getConnector('connectors/Slack').setStatus("U8675636646",event.req.query.slack_status); 
});

app.start();
```
