const {HttpConnector, Reshuffle} = require('../..');

const app = new Reshuffle();
const connector = new HttpConnector();
const path = require('path')

app.register(connector);

app.when(connector.on({method: 'GET', path: '/test'}), async (event) =>
  new Promise(
    (resolve, reject) =>
      event.context.res.sendFile(path.resolve('test.html'), error => error ? reject() : resolve())
  )
);

app.start();