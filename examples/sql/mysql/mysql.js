const { Reshuffle } = require('reshuffle')
const { MySQLConnector } = require('reshuffle-mysql-connector')

// This example uses reshuffle-mysql-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-mysql-connector

const app = new Reshuffle()
const mysql = new MySQLConnector(app, {
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

async function main() {
  let name = 'John'
  let age = 35
  let result = await mysql.query('select * from users')          
  console.log('==> Starting with this data in Users table: ',result.rows)

  await mysql.query(
    'INSERT INTO Users  values (?, ?) ', [name, age]
  )

  result = await mysql.query(`SELECT * FROM Users where name = ? `, [name, age])
  console.log('==> After insert new row: ',result.rows)

  name = 'Tom'
  age = 35
  const params = [name, age]
  await mysql.transaction(async (query) => {
    await query('delete from Users where name = ? and age = ?', params)
    await query('INSERT INTO Users(name, age) VALUES (?, ?) ', params)
    return query('SELECT * FROM Users where name = ? and age = ?', params)
  })

  result = await mysql.query('SELECT * FROM Users where name = ? and age = ?', params)
  console.log('==> Result after transaction: ',result.rows)
  mysql.close()
}

app.start()

main()