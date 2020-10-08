const { CronConnector, HttpConnector, Reshuffle } = require('../..')

const httpConnectionName = 'myHttpConnection'

const app = new Reshuffle()

const cronConnector = new CronConnector(app)
new HttpConnector(app, undefined, httpConnectionName)

cronConnector.on({ expression: '*/5 * * * * *' }, async (event, app) => {
  const HTTPConnection = app.getConnector(httpConnectionName)

  const parsedURL = HTTPConnection.parseURL(
    'https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49/',
  )
  console.log('parsedURL', parsedURL)

  const formattedURL = HTTPConnection.formatURL(parsedURL)
  console.log('formattedURL', formattedURL)

  const response = await HTTPConnection.fetch(formattedURL)
  // const response = await HTTPConnection.fetchWithRetries(formattedURL)
  // const response = await HTTPConnection.fetchWithTimeout(formattedURL, {}, 5) // Should time out

  const data = await response.json()

  console.log('data', JSON.stringify(data))
})

app.start()
