const { Reshuffle, CronConnector } = require('../..')
const app = new Reshuffle()

const connector = new CronConnector(app)

// eslint-disable-next-line no-unused-vars
connector.on({ expression: '*/1 * * * * *' }, (event, app) => {
  const logger = app.getLogger()

  logger.info('an info')
  logger.warn('a warning')
  logger.error('an error')
})

app.start()
