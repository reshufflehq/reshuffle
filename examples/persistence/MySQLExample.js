const { Reshuffle, CronConnector, MySQLStoreAdapter } = require('../../dist')
const mysql = require('mysql2/promise')

const app = new Reshuffle()

const connector = new CronConnector(app)

// See more information about connection attributes in
// https://www.npmjs.com/package/mysql2
// and https://github.com/mysqljs/mysql#connection-options

const pool = mysql.createPool()
const persistentStore = new MySQLStoreAdapter(pool, 'reshuffledb')

app.setPersistentStore(persistentStore)

connector.on({ expression: '*/5 * * * * *' }, async (event, app) => {
  const store = app.getPersistentStore()
  // single server setup
  let times = (await store.get('scripts/times-said-hello')) || 0
  console.log(`Hello World! ${times} times.`)
  times++
  await store.set('scripts/times-said-hello', times)

  // for destributed setup with many reshuffle servers set() should be replaced with update()
  let safe_count_times = (await store.get('scripts/times-said-hello-safe_count_times')) || 0
  console.log(`Hello World! safe count = ${safe_count_times} times.`)
  await store.update('scripts/times-said-hello-safe_count_times', (safe_count_times) => {
    return safe_count_times === undefined ? 1 : safe_count_times + 1
  })
})

app.start()
