const { HttpConnector, Reshuffle } = require('../..')

const app = new Reshuffle()
const connector = new HttpConnector(app)

connector.on({ method: 'GET', path: '/test' }, (event) => {
  event.context.res.end('Hello World!')
})

app.start()
