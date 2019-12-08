import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success, Output, Exit, Signal } from 'specshell';
import * as tar from 'tar';

const test = anyTest as TestInterface<Context>;

addFake(test);

const defaultApp = {
  accountId: 'fake-account-id',
  createdAt: new Date('1977-09-05T12:55:55Z'),
  updatedAt: new Date('1977-09-09T12:55:55Z'),
  locked: false,
  name: 'fake-name',
  environments: [],
};

const stabilize = (result: Output<string> & (Exit | Signal)) => ({
  ...result,
  out: result.out
    .replace(/up to date in [0-9][.0-9]*s/g, 'up to date')
    .replace(/found [0-9]* vulnerabilities/g, '')
    .replace(/localhost:[0-9]*/, 'localhost'),
  err: result.err
    .replace(/localhost:[0-9]*/, 'localhost'),
});

const anything = td.matchers.anything();

const drainToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const data: Buffer[] = [];
  for await (const chunk of stream) {
    data.push(chunk as Buffer); // assume ReadableStream with no encoding
  }
  return Buffer.concat(data);
};

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

test.serial('no args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} download`, 'utf-8');
  t.snapshot(result);
});

test.serial('too many args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} download arg extra-arg`, 'utf-8');
  t.snapshot(result);
});

test.serial('missing application', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'no-such-app-id')).thenReject(new Error('not found'));

  const result = await t.context.shell.run(`${t.context.run} download no-such-app-id`, 'utf-8');
  t.snapshot(result);
});

test.serial('verbose missing application', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'no-such-app-id')).thenReject(new Error('not found'));

  const result = await t.context.shell.run(`${t.context.run} download -v no-such-app-id`, 'utf-8');
  t.snapshot(result);
});

test.serial('no source url', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-no-source')).thenResolve({
    ...defaultApp,
    id: 'app-with-no-source',
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-no-source`, 'utf-8');
  t.snapshot(result);
});

test.serial('verbose no source url', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-no-source')).thenResolve({
    ...defaultApp,
    id: 'app-with-no-source',
  });

  const result = await t.context.shell.run(`${t.context.run} download -v app-with-no-source`, 'utf-8');
  // console.log(application) output differs between node versions, squash it for test
  t.snapshot({ ...result, out: result.out.replace(/\n/g, '').replace('{  ', '{ ').replace(/([^ ])}/, '$1 }') });
});

test.serial('bad url', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-bad-url')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'app-with-bad-url',
    source: {
      name: 'foo',
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-url/foo`,
      downloadDir: 'someDir',
      targetDir: 'someDir',
      zipUrl: 'xxx',
    },
  });
  (t.context.lycanServer as any).router.koaRouter.get('/bad-url/foo', (ctx: any) => {
    ctx.status = 401;
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-bad-url`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('bad tgz', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-bad-tgz')).thenResolve({
    ...defaultApp,
    id: 'foo',
    name: 'app-with-bad-tgz',
    source: {
      name: 'foo',
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-tgz/archive/master.tar.gz`,
      downloadDir: 'bad-tgz',
      targetDir: 'bad-tgz',
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['bad-tgz']);
  const tgzBuffer = await drainToBuffer(tarStream);
  const partialBuffer = tgzBuffer.slice(0, -100);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-tgz/archive/master.tar.gz', (ctx: any) => {
    ctx.body = partialBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-bad-tgz`, 'utf-8');
  t.snapshot(result);
});

test.serial('verbose bad tgz', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-bad-tgz')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'app-with-bad-tgz',
    source: {
      name: 'foo',
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-tgz/archive/master.tar.gz`,
      downloadDir: 'bad-tgz',
      targetDir: 'bad-tgz',
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['bad-tgz']);
  const tgzBuffer = await drainToBuffer(tarStream);
  const partialBuffer = tgzBuffer.slice(0, -100);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-tgz/archive/master.tar.gz', (ctx: any) => {
    ctx.body = partialBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download -v app-with-bad-tgz`, 'utf-8');
  t.snapshot(result);
});

test.serial('bad request', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-bad-req')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'app-with-bad-req',
    source: {
      name: 'foo',
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-req/archive/master.tar.gz`,
      downloadDir: 'bad-req-master',
      targetDir: 'bad-req',
      zipUrl: 'xxx',
    },
  });
  (t.context.lycanServer as any).router.koaRouter.get('/bad-req/archive/master.tar.gz', async (ctx: any) => {
    ctx.req.socket.destroy();
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-bad-req`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('verbose bad request', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'app-with-bad-req')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'app-with-bad-req',
    source: {
      name: 'foo',
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-req/archive/master.tar.gz`,
      downloadDir: 'bad-req',
      targetDir: 'bad-req',
      zipUrl: 'xxx',
    },
  });
  (t.context.lycanServer as any).router.koaRouter.get('/bad-req/archive/master.tar.gz', async (ctx: any) => {
    ctx.req.socket.destroy();
  });

  const result = await t.context.shell.run(`${t.context.run} download -v app-with-bad-req`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('tgz with wrong dir', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'bad-dir')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'bad-dir',
    source: {
      name: 'foo',
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/bad-dir/archive/master.tar.gz`,
      downloadDir: 'not-good',
      targetDir: 'still-not-good',
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-dir/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download bad-dir`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('good tgz existing target file', async (t) => {
  const targetDir = 'fubar';
  td.when(t.context.lycanFake.getAppByName(anything, 'exist-app')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'exist-app',
    source: {
      name: 'foo',
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/exist-app/archive/master.tar.gz`,
      downloadDir: 'good-app-master',
      targetDir,
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/exist-app/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });
  const result = await t.context.shell.run(`touch ${targetDir} && ${t.context.run} download exist-app`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('good tgz existing non empty target dir', async (t) => {
  const targetDir = 'fubar';
  td.when(t.context.lycanFake.getAppByName(anything, 'exist-app')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'exist-app',
    source: {
      name: 'foo',
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/exist-app/archive/master.tar.gz`,
      downloadDir: 'good-app-master',
      targetDir,
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/exist-app/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });
  const result = await t.context.shell.run(`mkdir -p ${targetDir}/x && ${t.context.run} download exist-app`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('good tgz existing empty target dir', async (t) => {
  const targetDir = 'fubar';
  td.when(t.context.lycanFake.getAppByName(anything, 'exist-app')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'exist-app',
    source: {
      name: 'foo',
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/exist-app/archive/master.tar.gz`,
      downloadDir: 'good-app-master',
      targetDir,
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/exist-app/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });
  const result = await t.context.shell.run(`mkdir ${targetDir} && ${t.context.run} download exist-app`, 'utf-8');
  t.snapshot(stabilize(result));
});

test.serial('good tgz', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'good-app')).thenResolve({
    ...defaultApp,
    id: 'ff-ff-ff',
    name: 'good-app',
    source: {
      name: 'foo',
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/good-app/archive/master.tar.gz`,
      downloadDir: 'good-app-master',
      targetDir: 'good-app',
      zipUrl: 'xxx',
    },
  });
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/good-app/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download good-app`, 'utf-8');
  t.snapshot(stabilize(result));
});
