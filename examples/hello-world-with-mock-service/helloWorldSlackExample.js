const {Reshuffle, CronService, SlackService} = require('../../')
const app = new Reshuffle();
const cronService = new CronService();
// eslint-disable-next-line no-undef
const slackService = new SlackService({'authkey': process.env.SLACK_AUTH_KEY});

app.register(cronService);
app.register(slackService, 'services/Slack')

app.when(cronService.on({'interval':5000}), (event) => {
  event.getService('services/Slack').send('Hello World!');
})

app.start(() => {
  console.log(`Example workflow`)
})