# Reshuffle Connectors
Reshuffle is a framework that lets you connect to services, create integrations between systems, and build workflows using these services and systems. 
Connectors facilitate that connector to a 3rd party service or system -  for example, if you want to connect to Saleforce you would use the Salesforce connector.

Reshuffle comes with several connectors out of the box, to connect to common systems. 
The framework is also extendable, and you can create connectors to your own proprietary system. If you want to build your own connector, please follow this [manual]("./building-connectors"). 

## Common Reshuffle Connectors

#### Cron Connector
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

app.when(connector.on({'interval':5000}), (event) => {
  event.getConnector('connectors/email')
    .send('daily report!', 'the report itself', [list of emails]);
});

app.start()
```

#### HTTP Connector
*NPM Package:*  reshuffle