const { Reshuffle } = require('reshuffle')
const { ElasticsearchConnector } = require('reshuffle-elasticsearch-connector')

const elasticsearchOptions = {
  cloud: {
    id: '<cloud-id>',
  },
  auth: {
    username: '<username>',
    password: '<password>',
  },
}

const app = new Reshuffle()
const elasticsearchConnector = new ElasticsearchConnector(app, elasticsearchOptions)

async function main() {
  await elasticsearchConnector.sdk().index({
    index: '<deployment-name>',
    body: {
      // all properties are optionals
      key1: 'value1',
      key2: 'value2',
      location: {
        lat: 40.768906,
        lon: -73.975421,
      },
    },
  })

  const results = await elasticsearchConnector.sdk().search({
    index: '<deployment-name>',
    body: {
      query: {
        match: { key1: 'value1' },
      },
    },
  })

  console.log('search results', results.body.hits)
}

app.start()

main()
