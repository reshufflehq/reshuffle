const {Reshuffle, CronConnector} = require('../..')
const app = new Reshuffle();

const connector = new CronConnector();

app.register(connector);

// eslint-disable-next-line no-unused-vars
app.when(connector.on({interval:5000}), (event) => {
  console.log('Hello World!');
  console.info('an info');
  console.warn('a warning');
  console.error('an error');

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
