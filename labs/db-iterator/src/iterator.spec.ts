import anyTest, { TestInterface } from 'ava';
import iterateFind from '.';
// TODO(ariels): Change db-client to allow starting a client late,
//     *without* environment variables.
import { DB, Q } from '@reshuffle/db/dist/db';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { tmpdir } from 'os';
import { promisify } from 'util';
import * as path from 'path';
import { Handler } from '@reshuffle/leveldb-server';
import { DBRouter } from '@reshuffle/interfaces-koa-server';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import { AddressInfo } from 'net';

// TODO(ariels): Extract; used also in db-client.
interface Context {
  db: DB;
  dbDir: string;
}

const test = anyTest as TestInterface<Context>;

const app = new Koa();
const router = new KoaRouter();
app.use(router.routes());
app.use(router.allowedMethods());
const server = app.listen(0, '127.0.0.1');
const port = new Promise<number>((res) => {
  server.once('listening', () => {
    res((server.address() as AddressInfo).port);
  });
});

let count = 0;

test.beforeEach(async (t) => {
  const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
  const handler = new Handler(`${dbDir}/root.db`, undefined, (err) => t.fail(err && err.toString()));
  const dbRouter = new DBRouter(handler);
  const title = `${++count}`;
  router.use(`/${title}`, dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());

  const ctx = {
    appId: `testing:${title}`,
    appEnv: 'default',
    collection: 'test',
    auth: {},
  };
  const db = new DB(`http://localhost:${await port}/${title}`, ctx, { timeoutMs: 1000 });

  t.context = {
    db,
    dbDir,
  };
});

test.afterEach(async (t) => {
  await rmrf(t.context.dbDir);
});

async function iteratorToArray<T>(it: AsyncIterableIterator<T>): Promise<T[]> {
  const res: T[] = [];
  for await (const next of it) {
    res.push(next);
  }
  return res;
}

test('iterateFind over nothing returns nothing', async (t) => {
  const { db } = t.context;
  await db.create('b', 2);
  const filter = Q.key.eq('a');
  const result = await iteratorToArray(iterateFind(Q.filter(filter), undefined, db));
  t.deepEqual(result, []);
});

test('iterateFind over single chunk returns that chunk', async (t) => {
  const { db } = t.context;
  await db.create('a', 1);
  await db.create('b', 2);
  const filter = Q.key.gte('a');
  const result = await iteratorToArray(iterateFind(Q.filter(filter), undefined, db));
  t.deepEqual(result, [{ key: 'a', value: 1 }, { key: 'b', value: 2 }]);
});

test('iterateFind over multiple chunks', async (t) => {
  const { db } = t.context;
  await db.create('a', 1);
  await db.create('b', 2);
  await db.create('c', 3);
  const filter = Q.key.startsWith('');
  const result = await iteratorToArray(
    iterateFind(Q.filter(filter).orderBy(Q.key), { chunkSize: 2 }, db));
  t.deepEqual(result, [{ key: 'a', value: 1 }, { key: 'b', value: 2 }, { key: 'c', value: 3 }]);
});

test.skip('iterateFind retrieves a snapshot', async (t) => {
  const { db } = t.context;
  await db.create('a', 1);
  await db.create('b', 2);
  const filter = Q.key.startsWith('');
  const finder = iterateFind(Q.filter(filter).orderBy(Q.key), { chunkSize: 1 }, db);
  t.deepEqual((await finder.next()).value, { key: 'a', value: 1 });
  await db.create('c', 3);
  const result = await iteratorToArray(finder);
  t.deepEqual(result, [{ key: 'b', value: 2 }]);
});

test('iterateFind works for DBs of non-trivial size', async (t) => {
  const size = 100;
  const { db } = t.context;
  const pairs = Array.from({ length: size }).map((_, index) => {
    const i = index.toString().padStart(6, '0');
    return { key: `key:${i}`, value: `value:${i}` };
  });
  await Promise.all(pairs.map(({ key, value }) => db.create(key, value)));
  const filter = Q.key.startsWith('');
  const result = await iteratorToArray(
    iterateFind(Q.filter(filter).orderBy(Q.key), { chunkSize: 37 }, db));
  t.deepEqual(result, pairs);
});
