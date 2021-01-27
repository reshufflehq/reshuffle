const { Reshuffle } = require('reshuffle')
const { ExcelConnector } = require('reshuffle-microsoft-connectors')

const app = new Reshuffle()

const excelConnector = new ExcelConnector(app, {
  AppId: 'YourMicrosoftAppId',
  AppPassword: 'YourMicrosoftAppPassword',
  AppTenantId: 'YourMicrosoftAppTenantId',
})

const RESOURCE_ID = 'drive/items/{item-id}'

async function main() {
  // Add a new Worksheet
  await excelConnector.addNewWorksheet(RESOURCE_ID, 'myNewWorksheet')
  // Update the a range on the Worksheet
  await excelConnector.updateRange(RESOURCE_ID, 'myNewWorksheet', 'A1:B2', [
    ['Count', '100'],
    ['12/4/2020', null],
  ])
}

app.start()

main()
