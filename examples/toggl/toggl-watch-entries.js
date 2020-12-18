const { Reshuffle } = require('reshuffle')
const { TogglConnector } = require('reshuffle-toggl-connector')

const app = new Reshuffle()

// https://support.toggl.com/en/articles/3116844-where-is-my-api-token-located
const togglConnector = new TogglConnector(app, { token: 'TOGGL_API_TOKEN' })

togglConnector.on({ type: 'TimeEntryAdded' }, async (event, app) => {
  console.log('TimeEntryAdded event ' + JSON.stringify(event))
  console.log('TimeEntry Added:')
  console.log('Id:', event.id)
  console.log('Start:', event.start)
  console.log('Stop:', event.stop)
  console.log('Description:', event.description)
})

togglConnector.on({ type: 'TimeEntryModified' }, async (event, app) => {
  console.log('ObjectModified event ' + JSON.stringify(event))
  console.log('TimeEntry Modified:')
  console.log('Id:', event.id)
  console.log('Start:', event.start)
  console.log('Stop:', event.stop)
  console.log('Description:', event.description)
})

togglConnector.on({ type: 'TimeEntryRemoved' }, async (event, app) => {
  console.log('TimeEntryRemoved event ' + JSON.stringify(event))
  console.log('TimeEntry Removed:')
  console.log('Id:', event.id)
  console.log('Start:', event.start)
  console.log('Stop:', event.stop)
  console.log('Description:', event.description)
})

app.start(8000)
