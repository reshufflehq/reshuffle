import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success } from 'specshell';
import * as tar from 'tar';

const test = anyTest as TestInterface<Context>;

addFake(test);

const defaultApp = {
  accountId: 'fake-account-id',
  createdAt: new Date('1977-09-05T12:55:55Z'),
  updatedAt: new Date('1977-09-09T12:55:55Z'),
  name: 'fake-name',
  environments: [],
};

const anything = td.matchers.anything();

const drainToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const data: Buffer[] = [];
  // as due to  https://github.com/palantir/tslint/issues/3997
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    data.push(chunk);
  }
  return Buffer.concat(data);
};

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

test('no args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} download`, 'utf-8');
  t.snapshot(result);
});

test('too many args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} download arg extra-arg`, 'utf-8');
  t.snapshot(result);
});

test('missing application', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([]);

  const result = await t.context.shell.run(`${t.context.run} download no-such-app-id`, 'utf-8');
  t.snapshot(result);
});

test('verbose missing application', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([]);

  const result = await t.context.shell.run(`${t.context.run} download -v no-such-app-id`, 'utf-8');
  t.snapshot(result);
});

test('no source url', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-no-source',
  }]);

  const result = await t.context.shell.run(`${t.context.run} download app-with-no-source`, 'utf-8');
  t.snapshot(result);
});

test('verbose no source url', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-no-source',
  }]);

  const result = await t.context.shell.run(`${t.context.run} download -v app-with-no-source`, 'utf-8');
  t.snapshot(result);
});

test('bad url', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-bad-url',
    source: {
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-url/foo`,
      downloadDir: 'someDir',
    },
  }]);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-url/foo', (ctx: any) => {
    ctx.status = 401;
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-bad-url`, 'utf-8');
  const stableResult = {
    ...result,
    err: result.err.replace(/localhost:[0-9]*/, 'localhost'),
  };
  t.snapshot(stableResult);
});

test('bad tgz', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-bad-tgz',
    source: {
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-tgz/archive/master.tar.gz`,
      downloadDir: 'bad-tgz',
    },
  }]);
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['bad-tgz']);
  const tgzBuffer = await drainToBuffer(tarStream);
  const partialBuffer = tgzBuffer.slice(0, -100);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-tgz/archive/master.tar.gz', (ctx: any) => {
    ctx.body = partialBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-bad-tgz`, 'utf-8');
  t.snapshot(result);
});

test('verbose bad tgz', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-bad-tgz',
    source: {
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-tgz/archive/master.tar.gz`,
      downloadDir: 'bad-tgz',
    },
  }]);
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['bad-tgz']);
  const tgzBuffer = await drainToBuffer(tarStream);
  const partialBuffer = tgzBuffer.slice(0, -100);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-tgz/archive/master.tar.gz', (ctx: any) => {
    ctx.body = partialBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download -v app-with-bad-tgz`, 'utf-8');
  t.snapshot(result);
});

test('bad request', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-bad-req',
    source: {
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-req/archive/master.tar.gz`,
      downloadDir: 'bad-req',
    },
  }]);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-req/archive/master.tar.gz', async (ctx: any) => {
    ctx.req.socket.destroy();
  });

  const result = await t.context.shell.run(`${t.context.run} download app-with-bad-req`, 'utf-8');
  const stableResult = {
    ...result,
    err: result.err.replace(/localhost:[0-9]*/, 'localhost'),
  };
  t.snapshot(stableResult);
});

test('verbose bad request', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'app-with-bad-req',
    source: {
      githubUrl: 'someUrl',
      downloadUrl: `${t.context.lycanUrl}/bad-req/archive/master.tar.gz`,
      downloadDir: 'bad-req',
    },
  }]);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-req/archive/master.tar.gz', async (ctx: any) => {
    ctx.req.socket.destroy();
  });

  const result = await t.context.shell.run(`${t.context.run} download -v app-with-bad-req`, 'utf-8');
  const stableResult = {
    ...result,
    out: result.out.replace(/localhost:[0-9]*/, 'localhost'),
    err: result.err.replace(/localhost:[0-9]*/, 'localhost'),
  };
  t.snapshot(stableResult);
});

test('tgz with wrong dir', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'bad-dir',
    source: {
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/bad-dir/archive/master.tar.gz`,
      downloadDir: 'not-good',
    },
  }]);
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/bad-dir/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download bad-dir`, 'utf-8');
  const stableResult = {
    ...result,
    out: result.out.replace(/up to date in [0-9][.0-9]*s/g, 'up to date'),
  };
  t.snapshot(stableResult);
});

test('good tgz', async (t) => {
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([{
    ...defaultApp,
    id: 'good-app',
    source: {
      githubUrl: 'foo',
      downloadUrl: `${t.context.lycanUrl}/good-app/archive/master.tar.gz`,
      downloadDir: 'good-app-master',
    },
  }]);
  const tarStream = tar.create({ gzip: true, cwd: 'src/test/apps' }, ['good-app-master']);
  const tgzBuffer = await drainToBuffer(tarStream);
  (t.context.lycanServer as any).router.koaRouter.get('/good-app/archive/master.tar.gz', (ctx: any) => {
    ctx.body = tgzBuffer;
  });

  const result = await t.context.shell.run(`${t.context.run} download good-app`, 'utf-8');
  const stableResult = {
    ...result,
    out: result.out.replace(/up to date in [0-9][.0-9]*s/g, 'up to date'),
  };
  t.snapshot(stableResult);
});
