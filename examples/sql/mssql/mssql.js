const { Reshuffle } = require('reshuffle')
const { MSSQLConnector } = require('reshuffle-mssql-connector')

// This example uses reshuffle-mssql-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-mssql-connector

const app = new Reshuffle()
const mssql = new MSSQLConnector(app, {
  server: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

async function main() {
  let name = 'John'
  let age = 35
  let result = await mssql.query('select * from users')
  console.log('==> Starting with this data in Users table: ', result.rows)

  await mssql.query('INSERT INTO Users values (@name, @age)', [
    { name: 'name', type: mssql.Text, value: name },
    { name: 'age', type: mssql.Int, value: age },
  ])

  result = await mssql.query(`SELECT * FROM Users where name = @name`, [
    { name: 'name', type: mssql.Text, value: name },
  ])
  console.log('==> After insert new row: ', result.rows)

  name = 'Tom'
  age = 35
  const params = [
    { name: 'name', value: name, type: mssql.Text },
    { name: 'age', type: mssql.Int, value: age },
  ]
  await mssql.transaction(async (query) => {
    await query('delete from Users where name = @name and age = @age', params)
    await query('INSERT INTO Users(name, age) VALUES (@name, @age)', params)
    return query('SELECT * FROM Users where name = @name and age = @age', params)
  })

  result = await mssql.query('SELECT * FROM Users where name = @name and age = @age', params)
  console.log('==> Result after transaction: ', result.rows)
  mssql.close()
}

app.start()

main()
