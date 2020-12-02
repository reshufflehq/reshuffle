const { HttpConnector, Reshuffle } = require('reshuffle')
const { AWSSQSConnector } = require('reshuffle-aws-connectors')

// The following examples use AWS Simple Queue Service
const queueUrl = 'https://sqs.<region>.amazonaws.com/<id>/<queue_name>'

const app = new Reshuffle()

// AWS SQS connector documentation: https://github.com/reshufflehq/reshuffle-aws-connectors/blob/master/doc/AWSSQSConnector.md
const sqsConnector = new AWSSQSConnector(app, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const httpConnector = new HttpConnector(app)

sqsConnector.on({ queueUrl }, (event, app) => {
  console.log('new message', event)
  //{ MessageId: '71c06956-76e1-4a8c-bc00-ed910566f36e', ReceiptHandle: 'AQEBTL1CTtn1clJ0XMSmRtpz7...', MD5OfBody: '9a72c70562843b823c2c9cad30665fe4', Body: 'Message from Reshuffle to queue' }
})

// When Reshuffle receives an HTTP request on /send/:id, it sends a new message in the queue using :id
httpConnector.on({ method: 'GET', path: '/send/:id' }, async (event, app) => {
  const pathSplit = event.req.path.split('/')
  const msg = pathSplit[pathSplit.length - 1]

  const response = await sqsConnector.sendMessage({
    MessageBody: 'Message from Reshuffle to queue: ' + msg,
    QueueUrl: queueUrl,
  })

  event.res.json({
    response: response.MessageId ? 'message sent to queue' : 'Something went wrong',
  })
})

// Delete all messages in the queue on /delete
httpConnector.on({ method: 'GET', path: '/delete' }, async (event, app) => {
  const response = await sqsConnector.sdk().receiveMessage({ QueueUrl: queueUrl }).promise()
  if (response.Messages) {
    for (const message of response.Messages) {
      await sqsConnector
        .sdk()
        .deleteMessage({ ReceiptHandle: message.ReceiptHandle, QueueUrl: queueUrl })
        .promise()
    }

    event.res.json({ response: 'message deleted from queue' })
  } else {
    event.res.json({ response: 'no message to delete' })
  }
})

app.start()
