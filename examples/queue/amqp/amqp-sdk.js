const { Reshuffle } = require('reshuffle')
const { AMQPConnector } = require('reshuffle-amqp-connector')

// This example uses reshuffle-amqp-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-amqp-connector
// Examples can be found in https://www.npmjs.com/package/amqplib
// and in https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html

const app = new Reshuffle()
const queueName = 'my-queue'
const queueUrl = 'amqp://localhost'

const amqp = new AMQPConnector(app, { 
  queueUrl: queueUrl, 
  queueName: queueName, 
  queueOptions: { durable: true } })

function messageHandler(msg) {
  console.log(`==> Message ${msg.content.toString()} received `)
}

async function main() {
  const sdk = amqp.sdk()

  const connection = await sdk.connect(queueUrl)
  const channel = await connection.createChannel()
  await channel.assertQueue(queueName, { durable: true })
  await channel.consume(
    queueName,
    (msg) => {
        messageHandler(msg)
      if (msg) { channel.ack(msg) }
    },
    {deliveryMode: true},
  )

  // Send the message content as a Buffer
  channel.sendToQueue(queueName, Buffer.from('MSG-001'), {deliveryMode: true})
  channel.sendToQueue(queueName, Buffer.from('MSG-002'))
}

app.start()

main()