const crypto = require('crypto')
const { HttpConnector, Reshuffle } = require('reshuffle')
const { AWSLambdaConnector } = require('reshuffle-aws-connectors')

const app = new Reshuffle()

const awsLambdaConnector = new AWSLambdaConnector(app, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const httpConnector = new HttpConnector(app)

async function main() {
  const funcName = `function-${crypto.randomBytes(8).toString('hex')}`

  console.log('Deploying Lambda function:', funcName)
  await awsLambdaConnector.createFromCode(
    funcName,
    `
    exports.handler = async (event, app) => {
      const str = event.str || 'Hello, world!'
      const response = {
        lower: str.toLowerCase(),
        upper: str.toUpperCase(),
      }
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      }
    }
  `,
  )

  httpConnector.on({ method: 'GET', path: '/go' }, async (event, app) => {
    const qid = await awsLambdaConnector.enqueue(funcName, [
      { str: 'Bruce Banner' },
      { str: 'Natasha Romanova' },
      { str: 'Toni Stark' },
    ])
    return event.res.json({ qid })
  })

  awsLambdaConnector.on({ type: 'QueueComplete' }, async (event, app) => {
    console.log('Queue processing complete:', event.qid)
    const count = event.payloads.length
    for (let i = 0; i < count; i++) {
      console.log(event.payloads[i], '->', event.resolutions[i])
    }

    console.log('Deleting Lambda function')
    await awsLambdaConnector.delete(funcName)
    process.exit(0)
  })

  app.start(8000)
}

main()
