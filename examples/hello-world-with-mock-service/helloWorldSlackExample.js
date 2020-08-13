const {Reshuffle, CronService, SlackService} = require('reshuffle')
const app = new Reshuffle();

app.addEvent('cron/sec/5', new CronService(5000));

app.addService("services/Slack", new SlackService("some options"))

app.when('cron/sec/5', (event) => {
  event.getService('services/Slack').send('Hello World!');
})

app.start(() => {
  console.log(`Example workflow`)
})