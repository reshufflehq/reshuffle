# AWS Elastic Transcoder Connector

This connector can be used to transcode video and audio using Amazon's
transcoder service. Full information about the Amazon Elastic Transcoder
service API can be found
[here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticTranscoder.html).

All actions throw in case of an error.

_Events_:

[JobStatusChanged](#JobStatusChanged) Transcoding job status changed

_Actions_:

[cancelJob](#cancelJob) Cancel a transcoding job

[createJob](#createJob) Start a transcoding job

[findPipelineByName](#findPipelineByName) Find pipeline by name

[findPresetByDescription](#findPresetByDescription) Find preset by description

[listPipelines](#listPipelines) Get a list of all transcoding pipelines

[listPresets](#listPresets) Get a list of all format presets

[readJob](#readJob) Get information about a transcoding job

_SDK_:

[sdk](#sdk) Get direct SDK access

## Event Details

### <a name="JobStatusChanged"></a>Job Status Changed event

_Example:_

```js
public handler(event) {
  console.log(`Job ${event.jobId}: ${
    event.old.Status} -> ${event.current.Status}`);
}
```

This event is fired when the status of a transcoding job changes.

Job status can be one of `Submitted`, `Progressing`, `Complete`,
`Canceled`, or `Error`.

## Action Details

### <a name="cancelJob"></a>Cancel Job action

_Definition:_

```ts
(
  id: string,
) => void
```

_Usage:_

```js
const job = await AmazonElasticTranscoder.createJob(...);
await AmazonElasticTranscoder.cancelJob(job.Id);
```

Cancel a transcoding job.

### <a name="createJob"></a>Create Job action

_Definition:_

```ts
(
  params: object,
) => object
```

_Usage:_

```js
const job = await AmazonElasticTranscoder.createJob({
  PipelineId: '3141592653589-pipipe',
  Input: {
    Key: 'my-input-file.mov',
  },
  Output: {
    PresetId: '2718281828459-045235',
    Key: 'my-output-file.mp4',
    Rotate: '180',
  },
});
```

This action start a new transcoding job using the specified pipeline. The
full set of parameters for creating a new job is described
[here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticTranscoder.html#createJob-property).

### <a name="findPipelineByName"></a>Find Pipeline By Name action

_Definition:_

```ts
(
  token: string,
) => object
```

_Usage:_

```js
const pipeline = await AmazonElasticTranscoder.findPipelineByName(
  'My Pipeline'
);
```

Find a pipeline whose name matches the specified token. Matching is performed according to different criteria in this order of preference:
* Exact match
* Exact case-insensitive match
* Name starts with token
* Token included in name

If no match is found, this action throws an Error.

### <a name="findPresetByDescription"></a>Find Preset By Description action

_Definition:_

```ts
(
  token: string,
) => object
```

_Usage:_

```js
const preset = await AmazonElasticTranscoder.findPresetByDescription('iphone');
```

Find a preset object with a description matching the specified token.
Matching is performed according to different criteria in this order of
preference:
* Exact match
* Exact case-insensitive match
* Description starts with token
* Token included in description

If no match is found, this action throws an Error.

### <a name="listPipelines"></a>List Pipelines action

_Definition:_

```ts
() => object[]
```

_Usage:_

```js
const pipelines = await AmazonElasticTranscoder.listPipelines();
```

List all the available transcoding pipelines. Pipelines define the S3
buckets for input and output video files, as well as encryption and
other storage related parameters, as described
[here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticTranscoder.html#listPipelines-property).


At this time, this connector does not support creation and modification of
pipelines. Pipelines can be created through the AWS console or the CLI.

### <a name="listPresets"></a>List Presets action

_Definition:_

```ts
() => object[]
```

_Usage:_

```js
const presets = await AmazonElasticTranscoder.listPresets();
```

Get a list of transcoding output
[presets](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticTranscoder.html#listPresets-property).

### <a name="readJob"></a>Read Job action

_Definition:_

```ts
(
  id: string,
) => object
```

_Usage:_

```js
const job = await AmazonElasticTranscoder.createJob(...);
await Script.sleep(1000);
const info = await AmazonElasticTranscoder.readJob(job.Id);
```

Get updated information on a transcoding job.

## SDK Details

### <a name="sdk"></a>SDK action

_Definition:_

```ts
(
  options ?: object,
) => object
```

_Usage:_

```js
const s3 = await S3.sdk();
```

Get the underlying SDK object. You can specify additional options to override
or add to the required fields in the connector's configuration.
