const { Reshuffle } = require('../..')
const { TwilioConnector } = require('reshuffle-twilio-connector')
const app = new Reshuffle()

// Create w Twilio account in few minutes for free: https://www.twilio.com/
const twilioConnector = new TwilioConnector(
  app, {
    accountSid: '<accountSid>',
    authToken: '<authToken>',
    twilioNumber: '<twilioNumber>'
  });

// Reply to an incoming message on <twilioNumber>
// Instructions on how to test Twilio webhook locally: https://www.twilio.com/docs/usage/tutorials/how-to-set-up-your-node-js-and-express-development-environment#install-ngrok-for-local-development
// To setup webhooks in Twilio, go to https://www.twilio.com/console/phone-numbers/incoming, select phone number, scroll all the way down to messaging, add method and path, save
twilioConnector.on({method:'POST', path:'/sms'}, (event) => {
  const messageReceived = event.context.req.body.Body
  console.log('message received:', messageReceived)

  if(messageReceived.includes('test')) {
    event.context.res.end("test successful")
  } else {
    event.context.res.end("Thanks for your message")
  }
})

app.start()

// Actions

// Send an sms
twilioConnector.sendSMS('Your SMS message here', '<to-phone-number>' )

// Send a MMS
twilioConnector.sendMMS('Your MMS message here', '<media-url>','<to-phone-number>' )

