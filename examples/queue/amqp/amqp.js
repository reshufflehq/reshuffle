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
  queueOptions: { durable: true },
})

amqp.on({ noAck: false }, messageHandler)

function messageHandler(msg) {
  console.log(`==> Message ${msg.content.toString()} received `)
}

async function main() {
  setTimeout(function () {
    amqp.sendMessage('MSG-011', { deliveryMode: true })
    amqp.sendMessage('MSG-012')
  }, 2000)
}

app.start()

main()
