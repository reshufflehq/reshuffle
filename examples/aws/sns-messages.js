const { HttpConnector, Reshuffle } = require('reshuffle')
const { AWSSNSConnector } = require('reshuffle-aws-connectors')

// The following example send a message via AWS SNS when Reshuffle receives an HTTP request on /send

const app = new Reshuffle()

const snsConnector = new AWSSNSConnector(app, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const httpConnector = new HttpConnector(app)

httpConnector.on({ method: 'GET', path: '/send' }, async (event, app) => {
  const params = {
    Message: 'Message from Reshuffle!',
    TopicArn: 'arn:aws:sns:<region>:<id>:<topic_name>',
  }

  const response = await snsConnector.publish(params)

  return event.res.json({ ok: !!response.MessageId })
})

app.start()
