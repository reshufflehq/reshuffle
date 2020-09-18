const { Reshuffle } = require('reshuffle')
const { GoogleSheetsConnector } = require('reshuffle-google-sheets-connector')
const app = new Reshuffle()

const myGoogleSheetsConnector = new GoogleSheetsConnector(
  app, {
    credentials: {
      client_email: "edit-google-spreadsheets@helical-kayak-287620.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC4qb6+WT91IVMf\nrfApF17vo6tRLXT49cP30ts5dej2WrywtKeaOCM6hgj6rotuVS4Msor6rLCdTLjx\n8IDQCl0FV6HMSo562jXZeMi7L6Qnk2ZqLAQbH8y8Ut9WeOx4i+gCHzAHt+1LiLG0\np0Bn2DwIR1rVPCIAu/TgPBEPyGPjYLCUmRUV4kFEA5HVmBsVpBRSbJUo2+XOJII7\nyxnkLKozuZUQULWZRx5MbCRsADR3ECH7J/S7Sortx/o2xkYEzN41a2PceAD8N2vj\nW2K7Xv3sri384m4rjJ5efD2lkvA+n9c9JFx0ng+nX6Bhoh151XmU4rbu6c7148Jw\npyU8A5UBAgMBAAECggEACVMittqrlUymkPnjVqNI1p0qGGkWSmTqqOWkqnPsSmhg\nbG1Pf+MMhzbx6LPXhi2x9PQK0P6yrv/mcqG3wJvoyd+hLOPyoTNcpJ4CtXLLD56K\nxpsDZceHFlce90qpxIX8pCdcA5sxQ5OtR0UhZGGY/eEr9xz9BSTmUUweDUx5iaeD\ngMcU4Fych/Wdp6ZrDApIleYrIl6dKg4U9B3oWtvOtCHli+HVsCOFpKFzkgH3zZ81\nPB2F6Ff7duTNb/+Sh8nGdvQKO7jQPumcecvk7A7yuAOasLHqj/8q+Pfg2sa3Tdv2\n25t9OLFzxAFVwZLuD0jt+zVlVYfvET8eAqe99mRdYwKBgQDj1dp3PjWLRyz05kuk\naN1+NpQbkoxaxR5UsGw0Ohi8Q3vi+8ub/HoaNdLQLSOhAjeP1e/DUvSuAOVc2WiA\n6aGs++6QNfUldXJlCpHseKS6MgqkTBRACC6LjO/X2Av2ijk4LgUGC0zp2c7de3/Z\n3gLVQoFugUIClmQ/GiTK3rYgqwKBgQDPfaXtjp+eSfwFyCf9yWCnbvvt4lD4uYE6\nrJKml7+W7Z06XyOuSFP1gX4fbOK++TfwuMSZQJUtb3EzfuqF8ysbPkF2oCt6/YGX\ndfJSh/uQqbYhvTlSL/yDS5hhJ6+rcoRCeXdWkviVUjJBekjcMbUMje0j2CvMqE8x\n9Fiy0RGZAwKBgHVFTRbVgW/4Kc7AfyzYATIG28M5cl8CWTNUP82+HZ9ByRGzc0EN\n+rdk/ubCZTVp07mIb8oE+AZcVbKuARlhqCNG5at66nzmcARMJYInMvrX6RxaQI4Y\n6ARSfd2GydmTmhIttc4/oM45mz3rZIp6uNCWU9LSW2zDhkPorAl0CyDTAoGAKlK+\n3c4R0P/WYHeLcMD67iw9RzC6w4FTUtyQrVqWwfqF77ooVQx708AuMcrMFZhQSNHn\niDscMsBgnthsjhYj3NK+F6xkMhozrOlqHFuQfNmhRRCL+K/BGib5Vhf6RUZ+o/CS\n3x3rhsnVZnXDFucsvvrUPFOD26MZRF9LGG584HECgYAl3tPdpRPWfEerMfz21D6Y\npS5FvEaxhgYYrnLuqp8tCHrtLq6f6IwRUVutNQ6lzZ0Bh4nDgImYJRTlQJ/xcVd0\nXVgRy04TwhArpZIO9O/4/0eur2k8pKSp4e89bkt65j35jg4f3EGDjv9oBXTt1FSf\nNIg7KfoWQzVtwi7EQn+2ow==\n-----END PRIVATE KEY-----\n",
    },
    spreadSheetId: '1910rrfT6J7e_HSNWe12aSJ4Zhar133xrL1NeXWdcEks'
  });

const myHandler = (event) => {
  // event.context is { oldRows, newRows, worksheetsRemoved: WorkSheetChanges[], worksheetsAdded: WorkSheetChanges[], worksheetsChanged: WorkSheetChanges[] }
  // WorkSheetChanges is { worksheetId, rowsRemoved, rowsAdded, rowsChanged }
  console.log('New rows detected!')
  event.options.sheetIdOrTitle && console.log(`'sheetIdOrTitle' is set in event options so it only checks for changes in sheet ${event.options.sheetIdOrTitle}`)

  event.context.newRows.forEach(({worksheetId, rows}) => {
    console.log(`workSheetId: ${worksheetId}`)

    rows.forEach((row, index) => {
      let rowString = `line ${index + 1}\t`
      Object.values(row).forEach(val => rowString += `${val}\t`)
      console.log(rowString)
    })
  })

  event.context.worksheetsChanged[0]
    && event.context.worksheetsChanged[0].rowsAdded[0]
    && console.log(`Example of new line values ${JSON.stringify(event.context.worksheetsChanged[0].rowsAdded[0])}`)
}

/** GoogleSheetsConnector Events */

/** Trigger a handler when changes are detected in document <spreadSheetId> (it will check for changes every 10 seconds) */
// myGoogleSheetsConnector.on({}, myHandler)

/** Check for changes every minute (it overrides the default timer set to 10 sec) */
const aMinuteMs = 60 * 1000
// myGoogleSheetsConnector.on({interval: aMinuteMs}, myHandler)

/** Check for changes in a specific sheet by id */
// myGoogleSheetsConnector.on({sheetIdOrTitle: 0}, myHandler)

/** Check for changes only in a specific sheet by title and every 30 seconds */
// myGoogleSheetsConnector.on({sheetIdOrTitle: 'Sheet1', interval: 30 * 1000}, myHandler)

app.start()

/** GoogleSheetsConnector Actions */

/** Get all rows in sheet by id|title */
const sheetId = 0
const sheetTitle = 'Sheet1'
// myGoogleSheetsConnector.getRows(sheetId).then((rows) => {
//   console.log(`Sheets contains ${rows.length} row(s)`)
//   rows.forEach(row => console.log(row._rawData))
// })

/** Get document info (returns an object with sheetCount and sheetsByIndex) */
// myGoogleSheetsConnector.getInfo().then((docInfo) => {
//   console.log(`Document has ${docInfo.sheetCount} sheets.`)
//
//   docInfo.sheetsByIndex.forEach(
//     sheetDetails => console.log(`[id: ${sheetDetails.sheetId}, title: ${sheetDetails.title}]`)
//   )
// })

/** Get cells for range in sheet by id|title */
const range = {startRowIndex: 1, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 2}
// myGoogleSheetsConnector.getCells(sheetTitle, range).then((rows) => {
//   console.log(`Sheets contains ${rows.length} row(s)`)
//   rows.forEach(row => console.log(row))
// })

/** Get cell at rowIndex, rowColumn details in sheet by id|title */
const rowIndex = 2
const columnIndex = 1
// myGoogleSheetsConnector.getCell(sheetId, rowIndex, columnIndex).then(
//    cell => console.log(`Cell details [value: ${cell.value}, a1Address: ${cell.a1Address},` +
//    ` rowIndex: ${cell.rowIndex}, columnIndex: ${cell.columnIndex}, a1Row: ${cell.a1Row}, a1Column:${cell.a1Column}]`)
// )

/** Get cell details by A1 in sheet by id|title */
const a1Address = 'B2'
// myGoogleSheetsConnector.getCellByA1(sheetTitle, a1Address).then(cell => console.log(`Cell has properties ${JSON.stringify(cell)}`))

/** Add a new row in sheet by id|title */
// myGoogleSheetsConnector.addRow(sheetId, ['value injected', Math.random(), (new Date()).toLocaleString()])

/** Amend values in sheet by id|title */
// myGoogleSheetsConnector.getRows(sheetTitle).then((rows) => {
//   console.log(`Sheets contains ${rows.length} row(s)`)
//
//   rows[0].score = Math.random() * 100
//   rows[0].date = (new Date()).toLocaleString()
//   rows[0].save()
// })

/** Delete a row in sheet id|title */
// myGoogleSheetsConnector.getRows(sheetTitle).then((rows) => {
//   console.log(`Sheets contains ${rows.length} row(s)`)
//
//   rows[rows.length - 1].delete() // Delete the last row in sheet
// })

/** Add new sheet using the sdk */
const newSheetTitle = 'new sheet'
const newSheetProperties = {title: newSheetTitle, headerValues: ['header 1', 'header 2', 'header 3']}
// myGoogleSheetsConnector.sdk().then(async (doc) => {
//   await doc.addSheet(newSheetProperties)
// })

/** Delete sheet by id|title using the sdk */
const sheetTitleToDelete = 'new sheet'
// myGoogleSheetsConnector.sdk().then(async (doc) => {
//   const sheet = doc.sheetsByTitle[sheetTitleToDelete]
//   // const sheet = doc.sheetsByIndex[2] // For deleting by sheet id
//   await sheet.delete()
// })
