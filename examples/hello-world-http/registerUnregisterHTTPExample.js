const {HttpService, Reshuffle} = require('../../');

const app = new Reshuffle();
const service = new HttpService();

app.register(service);

// Check 2 starts
app.start();
app.start();

app.when(service.on({'method':'GET','path':'/test'}), (event) => {
  event.res.end('Hello World!');
});

app.restart();

setTimeout(async () => {
  console.log('Unregister service after 20 seconds');
  await app.unregister(service);
}, 10000)