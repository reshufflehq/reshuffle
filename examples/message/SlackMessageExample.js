const { Reshuffle } = require('reshuffle')
const { SlackConnector, SlackEventType, SlackEvents } = require('reshuffle-slack-connector')
const app = new Reshuffle()

// Reshuffle Slack connector documentation: https://github.com/reshufflehq/reshuffle-slack-connector

const main = async () => {
  // Create a new Slack Connector: Token and signingSecret are found at https://api.slack.com/apps/<your_slack_app_id>/event-subscriptions
  const slackConnector = new SlackConnector(app, {
    token: '<your_slack_token_starting_with_xox>',
    signingSecret: '<your_slack_signing_secret>',
    port: '<slack_receiver_port>', // Default to 3000
    endpoints: '<slack_receiver_endpoints>', // Default to '/'
  })

  // Events
  slackConnector.on(
    {
      type: SlackEventType.EVENT,
      values: {
        type: SlackEvents.MESSAGE,
      },
    },
    (event) => {
      const payload = event.context.payload
      console.log(
        `Slack - message event detected [channel: ${payload.channel}, type: ${payload.type}, subtype: ${payload.subtype}]!`,
      )
      payload.message && console.log(`message info: ${JSON.stringify(payload.message)}`)
    },
  )

  app.start()

  // Actions
  const channel = 'C01AXNBH0QN'

  /** Post a message to channel */
  const responsePost = await slackConnector.postMessage(channel, 'Hello from Reshuffle app')
  console.log(`Message posted: ${responsePost.ok}, ts: ${responsePost.ts}`)

  /** Amend a message in channel */
  const responseAmend = await slackConnector.updateMessage(
    channel,
    'Hello from Reshuffle app amended',
    responsePost.ts,
  )
  console.log(`Message amended: ${responseAmend.ok}, ts: ${responseAmend.ts}`)

  /** Delete a message in channel */
  const deleteMessage = await slackConnector.deleteMessage(channel, responsePost.ts)
  console.log(`Message deleted: ${deleteMessage.ok}, ts: ${deleteMessage.ts}`)

  /** Post a schedule message to channel */
  const now = new Date()
  now.setTime(now.getTime() + 30 * 1000)
  const scheduleMessage = await slackConnector.scheduleMessage(
    channel,
    now,
    'Scheduled message from Reshuffle app',
  )
  console.log(`Message scheduled: ${scheduleMessage.ok}`)

  /** Post a advanced message to channel using a function */
  const messageGenerator = (msg) => {
    msg.text(
      `The Reshuffle framework allows you to interact with services such as AWS, Google Cloud and Twilio via Connectors.`,
    )
    msg.image(
      'https://vignette.wikia.nocookie.net/montypython/images/c/c1/Bridge_of_Death_monty_python_and_the_holy_grail_591679_800_4411271399897.jpg',
      'Bridge',
    )
    msg.link(
      'my link to image',
      'https://vignette.wikia.nocookie.net/montypython/images/c/c1/Bridge_of_Death_monty_python_and_the_holy_grail_591679_800_4411271399897.jpg',
    )
    msg.button('Blue', 'favorite-color')
    msg.button('Red', 'favorite-color')
    msg.button('Yellow', 'favorite-color')

    msg.divider()

    msg.primaryButton('Publish', 'publish')
    msg.dangerButton('Delete', 'publish')
  }

  const responsePostWithFunction = await slackConnector.postMessage(channel, messageGenerator)
  console.log(
    `Message with function: ${responsePostWithFunction.ok}, ts: ${responsePostWithFunction.ts}`,
  )

  /** Search messages */
  const responseSearch = await slackConnector.searchMessages('test')
  console.log(`Search response: ${responseSearch}`)
}

main()
