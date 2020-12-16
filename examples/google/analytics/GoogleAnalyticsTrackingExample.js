const { Reshuffle } = require('reshuffle')
const { GoogleAnalyticsConnector } = require('reshuffle-google-connectors')
const app = new Reshuffle()

const options = { trackingId: process.env.GOOGLE_TRACKING_ID } // UA-XXXXXXXXX-Y

const gaConnector = new GoogleAnalyticsConnector(app, options)

const main = async () => {
  await gaConnector.trackEvent('myCategory', 'myAction')

  await gaConnector.trackPageView('/myPagePath', 'myHostName', 'myTitle')
}

app.start()
main()
