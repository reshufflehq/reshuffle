const {Reshuffle, CronConnector} = require('../..')
const {SMTPConnector} = require('reshuffle-smtp-connector')
const app = new Reshuffle()

const smtpConnector = new SMTPConnector(
  {
    fromEmail: '<the "from" email address>',
    fromName: '<the "from" name>',
    host: '<smtp host>',
    port: 587, //<smtp port number - usually 587>
    username: '<username for smtp>',
    password: '<password for smtp>',
  },
  'connectors/SMTP'
);

const dailyTimerConnector = new CronConnector()
app.register(smtpConnector)
app.register(dailyTimerConnector)

const day = 1000 * 60 * 60 * 24
app.when(dailyTimerConnector.on({'interval': day}), (event) => {
  smtpConnector.send({
    to: '<recipient email address>',
    subject: 'Daily Report From Reshuffle',
    html: `<!doctype html>
            <html lang="en">
              <head>
              </head>
              <body>
                  <h1>Daily Report</h1>
                  <p>Everything is awesome!</p>
                  <small>Everything is cool when you&apos;re part of a team</small>
              </body>
            </html>`
  })
  console.log('Sent a daily report email')
});

app.start()
