const { Reshuffle } = require('reshuffle')
const { GoogleSheetsConnector } = require('reshuffle-google-connectors')
const { NlpConnector } = require('reshuffle-nlp-connector')
const app = new Reshuffle()
const sheetTitle = 'autoNLP'

const googleSheetConfig = {
  credentials: {
    client_email: '<your_client_email>',
    private_key: '<your_private_key>',
  },
  sheetsId: '<your_sheetsId>',
}
const googleSheetEventOptions = { sheetIdOrTitle: sheetTitle, interval: 10 * 1000 }

const nlpConnector = new NlpConnector(app)
const myGoogleSheetsConnector = new GoogleSheetsConnector(app, googleSheetConfig)

const runSentimentAnalysis = async (event, data) => {
  const rows = await myGoogleSheetsConnector.getRows(sheetTitle) // Get rows in write access

  rows.forEach(async (row) => {
    if (!row.score) {
      const result = await nlpConnector.sentiment(row.text) // Run sentiment analysis

      row.score = result.score
      row.vote = result.vote
      row.emoji = result.emoji
      row.date = new Date().toLocaleString()
      row.save()
    }
  })
}

/** Run sentiment analysis for each line without a score when changes are detected in spreadsheet document */
myGoogleSheetsConnector.on(googleSheetEventOptions, runSentimentAnalysis)

app.start()
