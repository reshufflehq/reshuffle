const { HttpConnector, Reshuffle } = require('../..')

const app = new Reshuffle()
const connector = new HttpConnector(app)
const path = require('path')

connector.on(
  { method: 'GET', path: '/test' },
  async (event, app) =>
    new Promise((resolve, reject) =>
      event.res.sendFile(path.resolve('test.html'), (error) => (error ? reject() : resolve())),
    ),
)

app.start()
