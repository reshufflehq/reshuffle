const { Reshuffle } = require('reshuffle')
const { NlpConnector } = require('reshuffle-nlp-connector')

const app = new Reshuffle()

const nlpConnector = new NlpConnector(app)

app.start()

async function main() {
  const result = await nlpConnector.sentiment('My text to analyze')
  console.log('Score: ', result.score, ' Vote: ', result.vote, ' Emoji: ', result.emoji)
}

main()
