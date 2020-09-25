const { Reshuffle } = require('reshuffle')
const { SlackConnector, SlackEventType, SlackEvents } = require('reshuffle-slack-connector')
const app = new Reshuffle()

const main = async () => {
  const slackConnector = new SlackConnector(app, {
    token: 'xoxb-1378697664115-1402336447888-Oy7qTjZ81TEJm9jwK0Trd6or',
    signingSecret: 'a8c08ef8e59b9c08334d83580b013329',
    port: 1234,
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
      console.log('new message posted on Slack!')
      console.log(JSON.stringify(event.context))
    },
  )

  app.start()

  // Actions

  // Send a message to channel
  const channel = 'C01AXNBH0QN'
  // const responsePost = await slackConnector.postMessage(channel, 'Hello from Reshuffle nodeJs app')
  // console.log(responsePost)
  //
  // const responseAmend = await slackConnector.updateMessage(
  //   channel,
  //   'Hello from Reshuffle nodeJs app amended amended',
  //   responsePost.ts,
  // )
  // console.log(responseAmend)
  //
  // const deleteMessage = await slackConnector.deleteMessage(channel, responsePost.ts)
  // console.log(deleteMessage)
  //
  // const now = new Date()
  // now.setTime(now.getTime() + 30 * 1000)
  // const scheduleMessage = await slackConnector.scheduleMessage(channel, now, 'Scheduled message!!!')
  // console.log(scheduleMessage)

  // const messageGenerator = (msg) => {
  //   msg.text(
  //     `The protagonists approach the Bridge of Death, whereupon the old man from Scene 24, who is the bridge-keeper, challenges them to correctly answer three questions to pass or they will be cast into the Gorge of Eternal Peril. Lancelot goes first, easily answers the elementary questions and crosses. Robin is done in by an unexpectedly difficult third question, and Galahad misses the answer to an easy one; both are flung into the gorge. The bridge keeper's final question is "What is the air-speed velocity of an unladen swallow?" Arthur responds with a question of his own, which the bridge keeper cannot answer, and is thrown in as well.`,
  //   )
  //   msg.image(
  //     'https://vignette.wikia.nocookie.net/montypython/images/c/c1/Bridge_of_Death_monty_python_and_the_holy_grail_591679_800_4411271399897.jpg',
  //     'Bridge',
  //   )
  //   msg.link(
  //     'my link to image',
  //     'https://vignette.wikia.nocookie.net/montypython/images/c/c1/Bridge_of_Death_monty_python_and_the_holy_grail_591679_800_4411271399897.jpg',
  //   )
  //   msg.button('Blue', 'favorite-color')
  //   msg.button('Red', 'favorite-color')
  //   msg.button('Yellow', 'favorite-color')
  //
  //   msg.divider()
  //
  //   msg.primaryButton('Publish', 'publish')
  //   msg.dangerButton('Delete', 'publish')
  // }
  //
  // const responsePostWithFunction = await slackConnector.postMessage(channel, messageGenerator)
  // console.log(responsePostWithFunction)

  // const responseSearch = await slackConnector.searchMessages('test')
  // console.log(responseSearch)

  await slackConnector.scheduleMessage(
    channel,
    new Date(Date.now() + 10000), // 10 seconds from current time
    'Scheduled message!',
    { mrkdwn: true },
  )
}

main()
