const { HttpConnector, Reshuffle} = require('../..');

const app = new Reshuffle();
const connector = new HttpConnector();

app.register(connector);

// Check 2 starts
app.start();
app.start();

app.when(connector.on({'method':'GET','path':'/test'}), (event) => {
  event.res.end('Hello World!');
});

app.restart();

setTimeout(async () => {
  console.log('Unregister connector after 20 seconds');
  await app.unregister(connector);
}, 10000)