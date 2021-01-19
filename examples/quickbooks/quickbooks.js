const { Reshuffle, SQLStoreAdapter, MemoryStoreAdapter } = require('reshuffle')
const { QuickbooksConnector } = require('reshuffle-quickbooks-connector')
const { Pool } = require('pg')

// This example uses reshuffle-quickbooks-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-quickbooks-connector

const app = new Reshuffle()
// Database Store:
// const pool = new Pool({user: 'RESHUFFLE_DB_USER',
//   host: 'RESHUFFLE_DB_HOST',
//   database: 'RESHUFFLE_DB',
//   password: 'RESHUFFLE_DB_PASS',
//   port: RESHUFFLE_DB_PORT})
// const persistentStore = new SQLStoreAdapter(pool, 'reshuffledb')

const persistentStore = new MemoryStoreAdapter()
app.setPersistentStore(persistentStore)

const quickbooksConnector = new QuickbooksConnector(app, {
  realmId: 'YOUR_REALM_ID',
  consumerKey: 'CONSUMER_KEY',
  consumerSecret: 'CONSUMER_SECRET',
  sandbox: true,
  debug: true,
  baseUrl: 'BASE_RUNTIME_URL',
  webhooksVerifier: 'WEBHOOK_VERIFIER',
})

// Calls handler when bill is updated
quickbooksConnector.on({ action: 'Bill/Update' }, async (event, app) => {
  console.log('Bill/Update event ')
  console.log(event.id)
  console.log(event.name)
  console.log(event.action)
})

// Calls handler when bill is created
quickbooksConnector.on({ type: 'Bill/Create' }, async (event, app) => {
  console.log('Bill/Create event ')
  console.log(event.id)
  console.log(event.name)
  console.log(event.operation)
})

async function main() {
  // The SDK call is inside a setTimeout to allow users clicking the authUri
  // and complete the authentication process

  // Get company info,
  setTimeout(async function () {
    const sdk = await quickbooksConnector.sdk()
    sdk.getCompanyInfo('YOUR_REALM_ID', function (err, result) {
      console.log('getCompanyInfo: ', JSON.stringify(result))
    })
  }, 30000)
  // See full list of Quickbooks client actions: https://www.npmjs.com/package/node-quickbooks
}

app.start()

main()
