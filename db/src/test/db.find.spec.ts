import anyTest, { TestInterface } from 'ava';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { DB, Q } from '../db';

interface Context {
  dbDir: string;
  db: DB;
}

const test = anyTest as TestInterface<Context>;

test.beforeEach(async (t) => {
  const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
  t.context = {
    dbDir,
    db: new DB(`${dbDir}/root.db`),
  };
});

test.afterEach(async (t) => {
  await rmrf(t.context.dbDir);
});

test('DB.find returns an empty list when no documents', async (t) => {
  const { db } = t.context;
  t.deepEqual(await db.find(Q.filter(Q.key.eq('abc'))), []);
});

test('DB.find returns an list of documents', async (t) => {
  const { db } = t.context;
  await db.create('abc', { a: 1 });
  t.deepEqual(await db.find(Q.filter(Q.key.eq('abc'))), [{ key: 'abc', value: { a: 1 } }]);
});

test('DB.find returns all matching documents', async (t) => {
  const { db } = t.context;
  await db.create('a', { a: 1 });
  await db.create('b', { a: 2 });
  await db.create('c', { a: 3 });

  t.deepEqual(await db.find(Q.filter(Q.value.a.gt(1))), [
    { key: 'b', value: { a: 2 } },
    { key: 'c', value: { a: 3 } },
  ]);
});

test('DB.find applies limit', async (t) => {
  const { db } = t.context;
  await db.create('a', { a: 1 });
  await db.create('b', { a: 2 });
  await db.create('c', { a: 3 });

  t.deepEqual(await db.find(Q.filter(Q.value.a.gt(0)).limit(2)), [
    { key: 'a', value: { a: 1 } },
    { key: 'b', value: { a: 2 } },
  ]);
});

test('DB.find applies skip', async (t) => {
  const { db } = t.context;
  await db.create('a', { a: 1 });
  await db.create('b', { a: 2 });
  await db.create('c', { a: 3 });

  t.deepEqual(await db.find(Q.filter(Q.value.a.gt(0)).skip(1)), [
    { key: 'b', value: { a: 2 } },
    { key: 'c', value: { a: 3 } },
  ]);
});

test('DB.find applies orderBy', async (t) => {
  const { db } = t.context;
  await db.create('a', { a: 1, b: 6 });
  await db.create('b', { a: 2, b: 3 });
  await db.create('c', { a: 3, b: 7 });

  t.deepEqual(await db.find(
    Q.filter(Q.value.a.gt(0))
    .skip(1)
    .limit(1)
    .orderBy(Q.value.b)
  ), [
    { key: 'a', value: { a: 1, b: 6 } },
  ]);
});

test('DB.find ignores tombstones', async (t) => {
  const { db } = t.context;
  await db.create('a', { a: 1, b: 6 });
  await db.remove('a');

  t.deepEqual(await db.find(
    Q.filter(Q.key.eq('a'))
  ), []);
});
