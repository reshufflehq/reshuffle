const { HttpConnector, Reshuffle } = require('reshuffle')
const { TogglConnector } = require('reshuffle-toggl-connector')

const app = new Reshuffle()

// https://support.toggl.com/en/articles/3116844-where-is-my-api-token-located
const togglConnector = new TogglConnector(app, { token: 'TOGGL_API_TOKEN' })

const httpConnector = new HttpConnector(app)

httpConnector.on({ method: 'GET', path: '/list' }, async (event, app) => {
  const timeEntries = await togglConnector.getTimeEntries(
    '2020-11-25T09:00:00Z',
    '2020-11-27T09:00:00Z',
  )
  event.res.json(timeEntries)
})

app.start(8000)
