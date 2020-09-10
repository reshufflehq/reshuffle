const {Reshuffle, CronConnector} = require('../..')
const app = new Reshuffle();

const connector = new CronConnector(app);

const logger = app.getLogger()

// eslint-disable-next-line no-unused-vars
connector.on({interval:5000}, (event) => {
  logger.info('an info');
  logger.warn('a warning');
  logger.error('an error');
})

app.start()

/*
setTimeout(async () => {
  console.log('Unregister the Cron connector');
  await app.unregister(connector);
}, 11000)
*/