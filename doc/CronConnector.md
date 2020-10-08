*NPM Package:*  [reshuffle](https://www.npmjs.com/package/reshuffle)

The Cron connector fires events according to the specified cron expression. If you are not familiar with cron expressions, you can use an online tool like [crontab.guru](https://crontab.guru) to help you generate one.

For example, you can use this connector to monitor a system every 10 seconds, or send a daily email report. 

Here is an example of how you would send a daily email using this connector:
```js
const { Reshuffle, CronConnector } = require('reshuffle')
const { SMTPConnector } = require('reshuffle-smtp-connector')

const app = new Reshuffle()
const cronConnector = new CronConnector(app)
const smtpConnector = new SMTPConnector(
  app,
  {
    username: 'superman',
    password: 'hunter123',
    host: 'email.some.com',
    port: 587,
    fromName: 'Spiderman II',
    fromEmail: 'admin@superheros.com',
  },
  'connectors/email',
)

cronConnector.on({ expression: '0 0 0 * * *' }, (event, app) => {
  app.getConnector('connectors/email').send({
    to: 'email@exmaple.com',
    subject: 'daily report!',
    html: 'The report itself',
  })
})

app.start()
```

_Triggers_:

[task](#task) Create a Cron task

### Event Details

#### <a name="task"></a>

Cron Event

_Event parameters:_

```
expression: string - the cron expression for a task
```

_Handler inputs:_

```
none, general event provided
```

_Example:_

```js
async (event, app) => {
  console.log('Task executed')
}
```

Execute a single task based on the cron expression
