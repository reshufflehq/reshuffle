# RESHUFFLE. THE INTEGRATION PLATFORM FOR DEVELOPERS.

[Express](https://expressjs.com) changed the way we build websites. [Reshuffle](https://github.com/reshufflehq/reshuffle) reinvents the way we integrate systems into workflows.

```javascript
const { Reshuffle, HttpService, S3Service } = require('reshuffle');

const app = new Reshuffle();
const httpService = app.use(new HttpService());
const s3Service = app.use(new S3Service({
  AWSAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  AWSSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: 'my-bucket',
}));

httpService.on({'method':'GET','path':'/test'}).do(async event => {
  const filenames = await s3Service.getObjectKeys();
  const images = filenames.filter(fn => fn.endsWith('.jpg') || fn.endsWith('.png'));
  event.res.json(images);
});

app.start(8000);
```

Reshuffle connects to every system inside and outside your organization. You can use one of the built in connectors, or build your own.

Out built in connectors can be found [here](https://github.com/reshufflehq/reshuffle/tree/master/lib).

### Open source

Reshuffle is free to use under the MIT license. You can clone it from out [GitHub Repo](https://github.com/reshufflehq/reshuffle).

### Reshuffle for enterprise

Reshuffle has an enterprise version which offers a web based IDE and management system. Learn more at [reshuffle.com](https://reshuffle.com).

### Contact us

Having trouble? Want to learn more? Contact us at [info@reshuffle.com](mailto:info@reshuffle.com).
