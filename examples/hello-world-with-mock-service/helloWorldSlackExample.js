const {Reshuffle, CronConnector, SlackConnector} = require('../..')
const app = new Reshuffle();
const cronConnector = new CronConnector();
// eslint-disable-next-line no-undef
const slackConnector = new SlackConnector({'authkey': process.env.SLACK_AUTH_KEY}, 'connectors/Slack');

app.register(cronConnector);
app.register(slackConnector);

app.when(cronConnector.on({'interval':5000}), (event) => {
  event.getConnector('connectors/Slack').send('Hello World!');
})

app.start(() => {
  console.log(`Example workflow`)
})