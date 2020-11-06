const { Reshuffle } = require('reshuffle')
const { NlpConnector } = require('reshuffle-nlp-connector')

const app = new Reshuffle()

const nlpConnector = new NlpConnector(app)

app.start()

function main() {
  const text = 'The text I want analyzed'
  const result = nlpConnector.language(text)
  console.log('Name: ', result.name, ' Code: ', result.code)
}

main()
