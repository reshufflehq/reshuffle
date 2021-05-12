const { Reshuffle } = require('reshuffle')
const { AMQPConnector } = require('reshuffle-amqp-connector')

// This example uses reshuffle-amqp-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-amqp-connector

const app = new Reshuffle()
const queueName = 'my-queue'
const queueUrl = 'amqp://localhost'

const amqp = new AMQPConnector(app, {
  queueUrl: queueUrl,
  queueName: queueName,
  queueOptions: { durable: true },
})

amqp.on({ noAck: false }, messageHandler)

function messageHandler(msg) {
  console.log(`==> Message ${msg.content.toString()} received`)
}

async function main() {
  setTimeout(function () {
    amqp.sendMessage('MSG-001', { deliveryMode: true })
    amqp.sendMessage('MSG-002')
  }, 2000)
}

app.start()

main()
