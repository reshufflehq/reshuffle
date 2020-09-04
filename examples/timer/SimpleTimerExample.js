const {Reshuffle, CronConnector} = require('../..')
const app = new Reshuffle();

const connector = new CronConnector();

app.register(connector);
const logger = app.getLogger()

// eslint-disable-next-line no-unused-vars
app.when(connector.on({interval:5000}), (event) => {
  logger.info('an info');
  logger.warn('a warning');
  logger.error('an error');

  throw new Error('error thrown')
});

// the above is syntactically equivalent to: 
//connector.on({'interval':5000}).do((event) => {
//    console.log('Hello World!')
//});

app.start()


setTimeout(async () => {
  console.log('Unregister the Cron connector');
  await app.unregister(connector);
}, 11000)
