const { Reshuffle } = require('reshuffle')
const { GoogleAnalyticsConnector } = require('reshuffle-google-connectors')
const app = new Reshuffle()

const options = { trackingId: 'UA-185467427-2' }

const gaConnector = new GoogleAnalyticsConnector(app, options)

const main = async () => {
  await gaConnector.trackEvent('myCategory', 'myAction')

  await gaConnector.trackPageView('/myPagePath', 'myHostName', 'myTitle')
}

app.start()
main()
