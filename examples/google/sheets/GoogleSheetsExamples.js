const { Reshuffle } = require('reshuffle')
const { GoogleSheetsConnector } = require('reshuffle-google-connectors')
const app = new Reshuffle()

const myGoogleSheetsConnector = new GoogleSheetsConnector(app, {
  credentials: {
    client_email: '<your_client_email>',
    private_key: '<your_private_key>',
  },
  sheetsId: '<your_sheetsId>',
})

const myHandler = async (event, app) => {
  // event is { oldRows, newRows, worksheetsRemoved: WorkSheetChanges[], worksheetsAdded: WorkSheetChanges[], worksheetsChanged: WorkSheetChanges[] }
  // WorkSheetChanges is { worksheetId, rowsRemoved, rowsAdded, rowsChanged }
  console.log('New rows detected!')
  event.options.sheetIdOrTitle &&
    console.log(
      `'sheetIdOrTitle' is set in event options so it only checks for changes in sheet ${event.options.sheetIdOrTitle}`,
    )

  event.newRows.forEach(({ worksheetId, rows }) => {
    console.log(`workSheetId: ${worksheetId}`)

    rows.forEach((row, index) => {
      let rowString = `line ${index + 1}\t`
      Object.values(row).forEach((val) => (rowString += `${val}\t`))
      console.log(rowString)
    })
  })

  event.worksheetsChanged[0] &&
    event.worksheetsChanged[0].rowsAdded[0] &&
    console.log(
      `Example of new line values ${JSON.stringify(event.worksheetsChanged[0].rowsAdded[0])}`,
    )
}

/** GoogleSheetsConnector Events */

/** Trigger a handler when changes are detected in document <spreadSheetId> (it will check for changes every 10 seconds) */
myGoogleSheetsConnector.on({}, myHandler)

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
const range = { startRowIndex: 1, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 2 }
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
const newSheetProperties = {
  title: newSheetTitle,
  headerValues: ['header 1', 'header 2', 'header 3'],
}
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
