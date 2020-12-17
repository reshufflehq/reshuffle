const { Reshuffle } = require('reshuffle')
const { MixpanelConnector } = require('reshuffle-mixpanel-connector')

// This example uses reshuffle-mixpanel-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-mixpanel-connector

const app = new Reshuffle()
const mixpanelConnector = new MixpanelConnector(app, {
  token: '56991289116de4d6ab5703ed2ee45a21',
  secret: '4dcae6b37d58049e1c532c02db400f83',
})

async function main() {
  mixpanelConnector.track('latlong', {
    key1: 'value1',
    key2: 'value2',
    lat: 40.800875,
    long: -73.945678,
  })

  const fiveDaysAgo = new Date() - 1000 * 60 * 60 * 24 * 5
  mixpanelConnector.import('imported event', fiveDaysAgo, {
    key1: 'import value1',
    key2: 'import value2',
    lat: 40.800431,
    long: -73.957127,
  })
}

app.start()

main()
