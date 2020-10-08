const { HttpConnector, Reshuffle } = require('reshuffle')
const { AWSS3Connector } = require('reshuffle-aws-connectors')

const app = new Reshuffle()

const s3Connector = new AWSS3Connector(app, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.AWS_BUCKET,
})

const httpConnector = new HttpConnector(app)

httpConnector.on({ method: 'GET', path: '/list' }, async (event, app) => {
  const keys = await s3Connector.listObjectKeys()
  event.res.json(keys)
})

app.start(8000)
