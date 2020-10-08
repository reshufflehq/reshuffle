const { HttpConnector, Reshuffle } = require('../..')

const app = new Reshuffle()
const connector = new HttpConnector(app)

// Check 2 starts
app.start()
app.start()

connector.on({ method: 'GET', path: '/test' }, (event, app) => {
  event.res.end('Hello World!')
})

app.restart()

setTimeout(async () => {
  console.log('Unregister connector after 10 seconds')
  await app.unregister(connector)
}, 10000)
