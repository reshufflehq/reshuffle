import anyTest, { TestInterface, Macro, Implementation } from 'ava';
import { AddressInfo } from 'net';
import { createServer, Server } from 'http';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import { range } from 'ramda';
import nanoid from 'nanoid';
import { DBRouter, DBHandler } from '@binaris/shift-interfaces-koa-server';
import { Version } from '@binaris/shift-interfaces-koa-server/interfaces';
import { DB, Q } from '@binaris/shift-db/dist/db';

interface Context {
  client: DB;
  supportsPolling: boolean;
  injectedContext: any;
}

export const test = anyTest as TestInterface<Context>;

export function incrVersion({ major, minor }: Version, amount: number = 1): Version {
  return { major, minor: minor + amount };
}

async function listenOn(app: Koa): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app.callback())
      .listen(undefined, 'localhost', () => resolve(server));
    server.once('error', reject);
  });
}

interface HandlerAndContext<T> {
  handler: DBHandler;
  supportsPolling: boolean;
  context: T;
}

interface HookContext {
  appId: string;
  appEnv: string;
}

interface TestHooks<T> {
  setUp(ctx: HookContext): Promise<HandlerAndContext<T>> | HandlerAndContext<T>;
  tearDown(ctx: T): Promise<void> | void;
}

const requiresPolling: Macro<[Implementation<Context>], Context> = (t, fn) => {
  if (!t.context.supportsPolling) {
    t.log('Skipping for lack of polling support');
    t.pass();
  } else {
    return fn(t);
  }
};

export function setUpTests<T>(
  { setUp, tearDown }: TestHooks<T>,
) {
  test.beforeEach(async (t) => {
    const appId = `${nanoid(6)}: ${t.title.replace(/^beforeEach hook for /,  '')}`;
    const appEnv = 'testing';

    const { context, handler, supportsPolling } = await setUp({ appId, appEnv });
    const dbRouter = new DBRouter(handler, true);
    const router = new KoaRouter();
    router.use('/v1', dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());
    const app = new Koa();
    app.use(router.routes());
    app.use(router.allowedMethods());

    const server = await listenOn(app);
    const { port } = server.address() as AddressInfo;
    const client = new DB(
      `http://localhost:${port}/v1`,
      {
        appId,
        appEnv,
        collection: 'default',
        auth: {
          v1: {
            token: 'test',
          },
        },
      },
      { timeoutMs: 5000 },
    );
    t.context = {
      client,
      injectedContext: context,
      supportsPolling,
    };
  });

  test.afterEach.always((t) => tearDown(t.context.injectedContext));
}

test('DB.get returns undefined when no key exists', async (t) => {
  const { client } = t.context;
  const value = await client.get('test');
  t.assert(value === undefined);
});

test('DB.create creates a new document and returns true', async (t) => {
  const { client } = t.context;
  const ret = await client.create('test', { a: 1 });
  const value = await client.get('test');
  t.deepEqual(value, { a: 1 });
  t.true(ret);
});

test('DB.create returns false if key already exists', async (t) => {
   const { client } = t.context;
   await client.create('test', { a: 1 });
   t.false(await client.create('test', { a: 2 }));
});

test('DB.create throws TypeError when value forced undefined', async (t) => {
  const { client } = t.context;
  await t.throwsAsync(client.create('test', undefined as any), {
    instanceOf: TypeError,
    message: /undefined/,
  });
});

test('DB.create throws TypeError when value is a function', async (t) => {
  const { client } = t.context;
  await t.throwsAsync(client.create('test', () => 17), {
    instanceOf: TypeError,
    message: /function/,
  });
});

test('DB.create throws TypeError when value is a bigint', async (t) => {
  const { client } = t.context;
  await t.throwsAsync(client.create('test', BigInt(17)), {
    instanceOf: TypeError,
    message: /bigint/,
  });
});

test('DB.create accepts arbitrary JSONables', async (t) => {
  const { client } = t.context;
  await client.create('test_string', 'hey');
  await client.create('test_number', 7);
  await client.create('test_boolean', true);
  await client.create('test_object', { a: [7] });
  await client.create('test_object', [{ a: 7 }]);
  t.pass();
});

test('DB.remove returns false when no key exists', async (t) => {
  const { client } = t.context;
  t.false(await client.remove('test'));
});

test('DB.remove returns false when key was already deleted', async (t) => {
  const { client } = t.context;
  await client.create('test', { a: 1 });
  await client.remove('test');
  t.false(await client.remove('test'));
});

test('DB.remove removes existing key from DB and returns true', async (t) => {
  const { client } = t.context;
  await client.create('test', { a: 1 });
  t.true(await client.remove('test'));
  t.is(await client.get('test'), undefined);
});

test('DB.remove removes the key', async (t) => {
  const { client } = t.context;
  await client.create('test', { a: 1 });
  t.true(await client.remove('test'));
  const value = await client.get('test');
  t.assert(value === undefined);
});

test('DB.update creates a new document if key does not exist, returns it, sets version to 1', async (t) => {
  const { client } = t.context;
  const next = await client.update('test', (prev) => ({ ...prev, a: 1 }));
  const value = await client.get('test');
  t.deepEqual(value, { a: 1 });
  t.deepEqual(next, value);
});

test('DB.update updates an existing document, returns it, and increments version', async (t) => {
  const { client } = t.context;
  await client.create('test', { b: 2 });
  const next = await client.update('test', (prev) => ({ ...prev, a: 1 }));
  const value = await client.get('test');
  t.deepEqual(value, { a: 1, b: 2 });
  t.deepEqual(next, value);
});

test('DB.update does nothing if document not updated', async (t) => {
  const { client } = t.context;
  await client.create('test', { b: 2 });
  const next = await client.update('test', (prev) => ({ ...prev }));
  const value = await client.get('test');
  t.deepEqual(value, { b: 2 });
  t.deepEqual(next, value);
  // TODO(ariels): Verify no update on an ongoing poll.
});

test('DB.poll returns patches which match requested versions', requiresPolling, async (t) => {
  const { client } = t.context;
  await client.create('test1', 'a');
  await client.create('test2', 'a');
  await client.create('test3', 'a');
  await client.create('test4', 'a');
  await client.create('test5', 'a');
  await client.update('test1', () => 'b');
  await client.update('test1', () => 'c');
  await client.update('test2', () => 'b');
  await client.update('test2', () => 'c');
  await client.update('test3', () => 'b');
  await client.remove('test3');
  const [
    major1,
    major2,
    major3,
    major4,
    major5,
  ] = await Promise.all(
    range(1, 5 + 1).map(async (x) => (await client.startPolling(`test${x}`))!.version.major)
  );
  const keyedPatches = await client.poll([
    ['test1', { major: major1, minor: 1 }],
    ['test2', { major: major2, minor: 2 }],
    ['test3', { major: major3, minor: 1 }],
    ['test4', { major: major4, minor: 1 }],
    ['test5', { major: major5, minor: 0 }],
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: { major: major1, minor: 2 }, ops: [{ op: 'replace', path: '/root', value: 'b' }] },
      { version: { major: major1, minor: 3 }, ops: [{ op: 'replace', path: '/root', value: 'c' }] },
    ]],
    ['test2', [
      { version: { major: major2, minor: 3 }, ops: [{ op: 'replace', path: '/root', value: 'c' }] },
    ]],
    ['test3', [
      { version: { major: major3, minor: 2 }, ops: [{ op: 'replace', path: '/root', value: 'b' }] },
      { version: { major: major3, minor: 3 }, ops: [{ op: 'remove', path: '/root' }] },
    ]],
    ['test5', [
      { version: { major: major5, minor: 1 }, ops: [{ op: 'replace', path: '/root', value: 'a' }] },
    ]],
  ]);
});

test('DB.poll returns on update if no new patches stored', requiresPolling, async (t) => {
  const { client } = t.context;
  await client.create('test1', 'a');
  const { version } = (await client.startPolling('test1'))!;
  const [keyedPatches] = await Promise.all([
    client.poll([['test1', version]]),
    client.update('test1', () => 'b'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: incrVersion(version), ops: [{ op: 'replace', path: '/root', value: 'b' }] },
    ]],
  ]);
});

test('DB.poll returns on remove if no new patches stored', requiresPolling, async (t) => {
  const { client } = t.context;
  await client.create('test1', 'a');
  const { version } = (await client.startPolling('test1'))!;
  const [keyedPatches] = await Promise.all([
    client.poll([['test1', version]]),
    client.remove('test1'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: incrVersion(version), ops: [{ op: 'remove', path: '/root' }] },
    ]],
  ]);
});

test('DB.poll returns on create if no new patches stored', requiresPolling, async (t) => {
  const { client } = t.context;
  const [keyedPatches] = await Promise.all([
    client.poll([['test1', { major: 0, minor: 0 }]]),
    client.create('test1', 'a'),
  ]);
  const { version } = (await client.startPolling('test1'))!;
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version, ops: [{ op: 'replace', path: '/root', value: 'a' }] },
    ]],
  ]);
});

test('DB.poll returns empty array when no patches emitted', requiresPolling, async (t) => {
  const { client } = t.context;
  const patches = await client.poll([['test1', { major: 0, minor: 0 }]], { readBlockTimeMs: 100 });
  t.deepEqual(patches, []);
});

test('DB.poll returns empty array when patches emitted on different key', requiresPolling, async (t) => {
  const { client } = t.context;
  const [patches] = await Promise.all([
    client.poll([['test1', { major: 0, minor: 0 }]], { readBlockTimeMs: 100 }),
    client.create('test2', 'a'),
  ]);
  t.deepEqual(patches, []);
});

test('DB.poll returns empty array when patches emitted on old version', requiresPolling, async (t) => {
  const { client } = t.context;
  const [patches] = await Promise.all([
    client.poll([['test1', { major: Number.MAX_SAFE_INTEGER, minor: 0 }]], { readBlockTimeMs: 100 }),
    client.create('test1', 'a'),
  ]);
  t.deepEqual(patches, []);
});

test('DB.create works after remove', async (t) => {
  const { client } = t.context;
  await client.create('test', 7);
  await client.remove('test');
  t.true(await client.create('test', 8));
  const value = await client.get('test');
  t.assert(value === 8);
});

// TODO(ariels): DB.update works after remove but increments version and includes tombstone\'s patches'

test('DB.update throws TypeError if updater returned undefined', async (t) => {
  const { client } = t.context;
  await t.throwsAsync(client.update('test', () => undefined as any), TypeError);
});

test('DB.update sets operationId', requiresPolling, async (t) => {
  const { client } = t.context;
  await client.update('test', () => 7, { operationId: 'abc' });
  const patches = await client.poll([['test', { major: 0, minor: 0 }]]);
  t.is(patches.length, 1);
  t.is(patches[0][0], 'test');
  t.is(patches[0][1].length, 1);
  t.is(patches[0][1][0].operationId, 'abc');
});

test('DB.find returns an empty list when no documents', async (t) => {
  const { client } = t.context;
  t.deepEqual(await client.find(Q.filter(Q.key.eq('abc'))), []);
});

test('DB.find returns an list of documents', async (t) => {
  const { client } = t.context;
  await client.create('abc', { a: 1 });
  t.deepEqual(await client.find(Q.filter(Q.key.eq('abc'))),
              [{ key: 'abc', value: { a: 1 } }]);
});

test('DB.find returns all matching documents', async (t) => {
  const { client } = t.context;
  await client.create('a', { a: 1 });
  await client.create('b', { a: 2 });
  await client.create('c', { a: 3 });

  t.deepEqual(await client.find(Q.filter(Q.value.a.gt(1))), [
    { key: 'b', value: { a: 2 } },
    { key: 'c', value: { a: 3 } },
  ]);
});

test('DB.find applies limit', async (t) => {
  const { client } = t.context;
  await client.create('a', { a: 1 });
  await client.create('b', { a: 2 });
  await client.create('c', { a: 3 });

  t.deepEqual(await client.find(
    Q.filter(Q.value.a.gt(0)).limit(2)
  ), [
    { key: 'a', value: { a: 1 } },
    { key: 'b', value: { a: 2 } },
  ]);
});

test('DB.find applies skip', async (t) => {
  const { client } = t.context;
  await client.create('a', { a: 1 });
  await client.create('b', { a: 2 });
  await client.create('c', { a: 3 });

  t.deepEqual(await client.find(
    Q.filter(Q.value.a.gt(0)).skip(1)
  ), [
    { key: 'b', value: { a: 2 } },
    { key: 'c', value: { a: 3 } },
  ]);
});

test('DB.find applies orderBy', async (t) => {
  const { client } = t.context;
  await client.create('a', { a: 1, b: 6 });
  await client.create('b', { a: 2, b: 3 });
  await client.create('c', { a: 3, b: 7 });

  t.deepEqual(await client.find(
    Q.filter(Q.value.a.gt(0)).skip(1).limit(1).orderBy(Q.value.b, Q.ASC)
  ), [
    { key: 'a', value: { a: 1, b: 6 } },
  ]);
});

test('DB.find ignores tombstones', async (t) => {
  const { client } = t.context;
  await client.create('a', { a: 1, b: 6 });
  await client.remove('a');

  t.deepEqual(await client.find(Q.filter(Q.key.eq('a'))), []);
});
