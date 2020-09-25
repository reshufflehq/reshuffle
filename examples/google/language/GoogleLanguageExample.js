const { Reshuffle } = require('reshuffle')
const { GoogleLanguageConnector } = require('reshuffle-google-connectors')
const app = new Reshuffle()

async function main() {
  const connector = new GoogleLanguageConnector(app, { credentials })
  const result = await connector.analyzeSentiment('The text I want analyzed')
  console.log('Language:', result.language, ' Sentiment score: ', result.documentSentiment.score)
}

main()
