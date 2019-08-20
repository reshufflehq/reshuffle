import anyTest, { TestInterface } from 'ava';
import { DB } from '@binaris/shift-leveldb-server';
import { DBRouter } from '@binaris/shift-interfaces-koa-server';
import { DBHandler } from '../..';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { tmpdir } from 'os';
import { promisify } from 'util';
import * as path from 'path';
import { AddressInfo } from 'net';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import { createServer, Server } from 'http';

interface Context {
  dbDir: string;
  client: DBHandler;
}

const test = anyTest as TestInterface<Context>;

async function listenOn(app: Koa): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app.callback())
      .listen(undefined, 'localhost', () => resolve(server));
    server.once('error', reject);
  });
}

process.env.APP_ID = 'testing';
process.env.API_KEY = '1234';

test.beforeEach(async (t) => {
  const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
  const db = new DB(`${dbDir}/root.db`);
  const dbRouter = new DBRouter(db, true);
  const router = new KoaRouter();
  router.use('/v1', dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());
  const app = new Koa();
  app.use(router.routes());
  app.use(router.allowedMethods());

  const server = await listenOn(app);
  const port = (server.address() as unknown as AddressInfo).port;
  const url = `http://localhost:${port}`;
  process.env.DB_BASE_URL = url;
  // Instantiate DBHandler with proper URL set up.
  const client = new DBHandler({ timeoutMs: 1000 });
  t.context = {
    dbDir,
    client,
  };
});

test.afterEach(async (t) => {
  await rmrf(t.context.dbDir);
});

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

// TODO(ariels): Retrieve poll tests from old db/src/db.ts.

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

test('CLIENT.update throws TypeError if trying to modify returned object', async (t) => {
  const { client } = t.context;
  await client.create('test', { a: 1, b: { c: 2, d: [5] } });
  await t.throwsAsync(client.update('test', (obj) => {
    (obj as any).a = 2;
    return obj;
  }), TypeError);
  await t.throwsAsync(client.update('test', (obj) => {
    (obj as any).b.c = 3;
    return obj;
  }), TypeError);
  await t.throwsAsync(client.update('test', (obj) => {
    (obj as any).b.d[0] = 6;
    return obj;
  }), TypeError);
});
