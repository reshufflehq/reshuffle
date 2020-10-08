const { Reshuffle } = require('reshuffle')
const { TwilioConnector } = require('reshuffle-twilio-connector')
const app = new Reshuffle()

// Create w Twilio account in few minutes for free: https://www.twilio.com/
const twilioConnector = new TwilioConnector(app, {
  accountSid: '<accountSid>',
  authToken: '<authToken>',
  twilioNumber: '<twilioNumber>',
})

// Reply to an incoming message on <twilioNumber>
// Instructions on how to test Twilio webhook locally: https://www.twilio.com/docs/usage/tutorials/how-to-set-up-your-node-js-and-express-development-environment#install-ngrok-for-local-development
// To setup webhooks in Twilio, go to https://www.twilio.com/console/phone-numbers/incoming, select phone number, scroll all the way down to messaging, add method and path, save
twilioConnector.on({ method: 'POST', path: '/sms' }, (event, app) => {
  console.log(event.req.body)
  // Example of console output:
  // {
  //   ToCountry = "US"
  //   ToState = "ID"
  //   SmsMessageSid = "SM9aca55a393c120f964cc49d91bfec52e"
  //   NumMedia = "0"
  //   ToCity = "DESMET"
  //   FromZip = "85004"
  //   SmsSid = "SM9aca55a393c120f964cc49d91bfec52e"
  //   FromState = "AZ"
  //   SmsStatus = "received"
  //   FromCity = "PHOENIX"
  //   Body = "msg line 1 line 2 line 3"
  //   FromCountry = "US"
  //   To = "+12082685987"
  //   ToZip = "99128"
  //   NumSegments = "1"
  //   MessageSid = "SM9aca55a393c120f964cc49d91bfec52e"
  //   AccountSid = "AC43820350f399443f2ab9a80ce59dc797"
  //   From = "+19282275501"
  //   ApiVersion = "2010-04-01"
  // }

  const messageReceived = event.req.body.Body
  const fromPhoneNumber = event.req.body.From
  console.log(`New SMS received from ${fromPhoneNumber}: ${messageReceived}`)

  if (messageReceived.includes('test')) {
    event.res.end('test successful')
  } else {
    event.res.end('Thanks for your message')
  }
})

app.start()

// Actions

// Send an sms
twilioConnector.sendSMS('Your SMS message here', '<to-phone-number>')

// Send a MMS
twilioConnector.sendMMS('Your MMS message here', '<media-url>', '<to-phone-number>')
