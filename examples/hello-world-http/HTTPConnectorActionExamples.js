const {CronConnector, HttpConnector, Reshuffle} = require('../..');

const httpConnectionName = 'myHttpConnection'

const app = new Reshuffle();

const cronConnector = new CronConnector();
const httpConnector = new HttpConnector(httpConnectionName);

app.register(httpConnector);
app.register(cronConnector);

app.when(cronConnector.on({'interval':5000}), async (event) => {
  const HTTPConnection = event.getConnector(httpConnectionName)

  const parsedURL = HTTPConnection.parseURL('https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49/')
  console.log('parsedURL', parsedURL)

  const formattedURL = HTTPConnection.formatURL(parsedURL)
  console.log('formattedURL', formattedURL)

  const response = await HTTPConnection.fetch(formattedURL)
  // const response = await HTTPConnection.fetchWithRetries(formattedURL)
  // const response = await HTTPConnection.fetchWithTimeout(formattedURL, {}, 5) // Should time out

  const data = await response.json()

  console.log('data',  JSON.stringify(data))
});

app.start();