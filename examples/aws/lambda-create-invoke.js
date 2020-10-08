const crypto = require('crypto')
const { Reshuffle } = require('reshuffle')
const { AWSLambdaConnector } = require('reshuffle-aws-connectors')

async function main() {
  const app = new Reshuffle()

  const awsLambdaConnector = new AWSLambdaConnector(app, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  })

  const funcName = `function-${crypto.randomBytes(8).toString('hex')}`

  console.log('Deploying Lambda function:', funcName)
  await awsLambdaConnector.createFromCode(
    funcName,
    `
    exports.handler = async (event, app) => {
      const a = event.a || 0
      const b = event.b || 0
      const response = {
        sum: a + b,
        prod: a * b,
      }
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      }
    }
  `,
  )

  const req = { a: 3, b: 5 }
  const res = await awsLambdaConnector.invoke(funcName, req)
  console.log('Lambda response:', req, '->', res)

  console.log('Deleting Lambda function')
  await awsLambdaConnector.delete(funcName)

  console.log('Goodbye.')
}

main()
