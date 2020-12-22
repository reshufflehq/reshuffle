const { Reshuffle } = require('reshuffle')
const { MixpanelConnector } = require('reshuffle-mixpanel-connector')

// This example uses reshuffle-mixpanel-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-mixpanel-connector

const app = new Reshuffle()
const mixpanelConnector = new MixpanelConnector(app, {
  token: '<mixpanel-token>',
  secret: '<mixpanel-secret>',
})

app.start()

// Track a new event in Mixpanel
mixpanelConnector.track('test', {
  key1: 'value1',
  key2: 'value2',
  lat: 40.800875,
  long: -73.945678,
})

const fiveDaysAgo = new Date() - 1000 * 60 * 60 * 24 * 5

// Import an event in Mixpanel
mixpanelConnector.import('imported event', fiveDaysAgo, {
  key1: 'import value1',
  key2: 'import value2',
  lat: 40.800431,
  long: -73.957127,
})
