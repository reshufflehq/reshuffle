const { HttpConnector, Reshuffle } = require('reshuffle')
const { AWSElasticTranscoderConnector } = require('reshuffle-aws-connectors')

async function main() {
  const app = new Reshuffle()

  const awsElasticTranscoder = new AWSElasticTranscoderConnector(app, {
    accessKeyId: process.env.SECRETS_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRETS_AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  })

  const httpConnector = new HttpConnector(app)

  const pipeline = await awsElasticTranscoder.findPipelineByName(
    process.env.ELASTIC_TRANSCODER_PIPELINE,
  )
  const preset = await awsElasticTranscoder.findPresetByDescription('240')

  httpConnector.on({ method: 'GET', path: '/go' }, async (event, app) => {
    const output = `video-${Date.now().toString(16)}.mp4`

    const job = await awsElasticTranscoder.createJob({
      PipelineId: pipeline.Id,
      Input: {
        Key: 'video.mov', // replace with actual filename
      },
      Output: {
        PresetId: preset.Id,
        Key: output,
        Rotate: '180',
      },
    })

    return event.res.json({ jobId: job.Id, output })
  })

  awsElasticTranscoder.on({ pipelineId: pipeline.Id }, async (event, app) => {
    console.log(
      `Transcoding job progress ${event.jobId}: ${event.old.Status} -> ${event.current.Status}`,
    )
  })

  app.start(8000)
}

main()
