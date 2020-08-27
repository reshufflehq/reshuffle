const {Reshuffle, CronService} = require('../../dist')
const app = new Reshuffle();
const service = new CronService();

app.register(service);

// eslint-disable-next-line no-unused-vars
app.when(service.on({'interval':5000}), (event) => {
  console.log('Hello World!');
});

// the above is syntactically equivalent to: 
//service.on({'interval':5000}).do((event) => {
//    console.log('Hello World!')
//});

app.start()

setTimeout(async () => {
  console.log('Unregister the Cron service');
  await app.unregister(service);
}, 16000)