const {HttpConnector, Reshuffle} = require('../..');

const app = new Reshuffle();
const connector = new HttpConnector();

app.register(connector);

app.when(connector.on({'method':'GET','path':'/test'}), (event) => {
  event.context.res.end("Hello World!");
});

// the above is syntactically equivalent to:
//connector.on({'method':'GET','path':'/test?foo'}).do((event) => {
//    event.context.res.end("Hello World!");
//})


app.start();