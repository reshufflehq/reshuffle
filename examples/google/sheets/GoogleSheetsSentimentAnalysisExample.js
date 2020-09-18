const {Reshuffle} = require('reshuffle')
const {GoogleSheetsConnector} = require('reshuffle-google-sheets-connector')
const {NlpConnector} = require('reshuffle-nlp-connector')
const app = new Reshuffle()

const runSentimentAnalysis = async () => {
  const rows = await myGoogleSheetsConnector.getRows(sheetTitle) // Get rows in write access

  rows.forEach(async row => {
    if (!row.score) {
      const result = await nlpConnector.sentiment(row.text) // Run sentiment analysis

      row.score = result.score
      row.vote = result.vote
      row.emoji = result.emoji
      row.date = (new Date()).toLocaleString()
      row.save()
    }
  })
}

const sheetTitle = 'autoNLP'
const googleSheetConfig = {
  credentials: {
    client_email: "edit-google-spreadsheets@helical-kayak-287620.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC4qb6+WT91IVMf\nrfApF17vo6tRLXT49cP30ts5dej2WrywtKeaOCM6hgj6rotuVS4Msor6rLCdTLjx\n8IDQCl0FV6HMSo562jXZeMi7L6Qnk2ZqLAQbH8y8Ut9WeOx4i+gCHzAHt+1LiLG0\np0Bn2DwIR1rVPCIAu/TgPBEPyGPjYLCUmRUV4kFEA5HVmBsVpBRSbJUo2+XOJII7\nyxnkLKozuZUQULWZRx5MbCRsADR3ECH7J/S7Sortx/o2xkYEzN41a2PceAD8N2vj\nW2K7Xv3sri384m4rjJ5efD2lkvA+n9c9JFx0ng+nX6Bhoh151XmU4rbu6c7148Jw\npyU8A5UBAgMBAAECggEACVMittqrlUymkPnjVqNI1p0qGGkWSmTqqOWkqnPsSmhg\nbG1Pf+MMhzbx6LPXhi2x9PQK0P6yrv/mcqG3wJvoyd+hLOPyoTNcpJ4CtXLLD56K\nxpsDZceHFlce90qpxIX8pCdcA5sxQ5OtR0UhZGGY/eEr9xz9BSTmUUweDUx5iaeD\ngMcU4Fych/Wdp6ZrDApIleYrIl6dKg4U9B3oWtvOtCHli+HVsCOFpKFzkgH3zZ81\nPB2F6Ff7duTNb/+Sh8nGdvQKO7jQPumcecvk7A7yuAOasLHqj/8q+Pfg2sa3Tdv2\n25t9OLFzxAFVwZLuD0jt+zVlVYfvET8eAqe99mRdYwKBgQDj1dp3PjWLRyz05kuk\naN1+NpQbkoxaxR5UsGw0Ohi8Q3vi+8ub/HoaNdLQLSOhAjeP1e/DUvSuAOVc2WiA\n6aGs++6QNfUldXJlCpHseKS6MgqkTBRACC6LjO/X2Av2ijk4LgUGC0zp2c7de3/Z\n3gLVQoFugUIClmQ/GiTK3rYgqwKBgQDPfaXtjp+eSfwFyCf9yWCnbvvt4lD4uYE6\nrJKml7+W7Z06XyOuSFP1gX4fbOK++TfwuMSZQJUtb3EzfuqF8ysbPkF2oCt6/YGX\ndfJSh/uQqbYhvTlSL/yDS5hhJ6+rcoRCeXdWkviVUjJBekjcMbUMje0j2CvMqE8x\n9Fiy0RGZAwKBgHVFTRbVgW/4Kc7AfyzYATIG28M5cl8CWTNUP82+HZ9ByRGzc0EN\n+rdk/ubCZTVp07mIb8oE+AZcVbKuARlhqCNG5at66nzmcARMJYInMvrX6RxaQI4Y\n6ARSfd2GydmTmhIttc4/oM45mz3rZIp6uNCWU9LSW2zDhkPorAl0CyDTAoGAKlK+\n3c4R0P/WYHeLcMD67iw9RzC6w4FTUtyQrVqWwfqF77ooVQx708AuMcrMFZhQSNHn\niDscMsBgnthsjhYj3NK+F6xkMhozrOlqHFuQfNmhRRCL+K/BGib5Vhf6RUZ+o/CS\n3x3rhsnVZnXDFucsvvrUPFOD26MZRF9LGG584HECgYAl3tPdpRPWfEerMfz21D6Y\npS5FvEaxhgYYrnLuqp8tCHrtLq6f6IwRUVutNQ6lzZ0Bh4nDgImYJRTlQJ/xcVd0\nXVgRy04TwhArpZIO9O/4/0eur2k8pKSp4e89bkt65j35jg4f3EGDjv9oBXTt1FSf\nNIg7KfoWQzVtwi7EQn+2ow==\n-----END PRIVATE KEY-----\n",
  },
  spreadSheetId: '1910rrfT6J7e_HSNWe12aSJ4Zhar133xrL1NeXWdcEks'
}
const googleSheetEventOptions = {sheetIdOrTitle: sheetTitle, interval: 10 * 1000}

const nlpConnector = new NlpConnector(app)
const myGoogleSheetsConnector = new GoogleSheetsConnector(app, googleSheetConfig);

/** Run sentiment analysis for each line without a score when changes are detected in spreadsheet document */
myGoogleSheetsConnector.on(googleSheetEventOptions, runSentimentAnalysis)

app.start()
