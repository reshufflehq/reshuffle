const { HttpConnector, Reshuffle } = require('../..')

const app = new Reshuffle()
const connector = new HttpConnector(app)

connector.on({ method: 'GET', path: '/test' }, (event, app) => {
  event.res.end('Hello World!')
})

connector.on({ method: 'GET', path: '/:id' }, (event, app) => {
  event.res.end('Generic handler')
})

app.start()
