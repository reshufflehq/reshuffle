const { Reshuffle } = require('reshuffle')
const { TeamsConnector } = require('reshuffle-microsoft-connectors')

const app = new Reshuffle()
const connector = new TeamsConnector(app, {
  AppId: process.env.AppId,
  AppPassword: process.env.AppPassword,
  AppTenantId: process.env.AppTenantId,
})

connector.on(
  {
    resource: '/teams/getAllMessages',
    changeType: 'created',
    runtimeBaseUrl: 'https://example.com',
    expirationDateTime: '2021-02-03T03:47:17.292Z',
  },
  (event) => console.log(event),
)

app.start()
