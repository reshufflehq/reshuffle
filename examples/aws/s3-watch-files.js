const { Reshuffle } = require('reshuffle')
const { AWSS3Connector } = require('reshuffle-aws-connectors')

const app = new Reshuffle()

const s3Connector = new AWSS3Connector(app, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.AWS_BUCKET,
})

s3Connector.on({ type: 'ObjectAdded' }, async (event, app) => {
  console.log(event)
})

app.start(8000)
