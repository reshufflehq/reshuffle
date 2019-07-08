import anyTest, { TestInterface } from 'ava';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { DB } from '../db';
import { ValueError } from '../errors';

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

test('DB.get returns undefined when no key exists', async (t) => {
  const { db } = t.context;
  t.is(await db.get('test'), undefined);
});

test('DB.create creates a new document and returns true', async (t) => {
  const { db } = t.context;
  const ret = await db.create('test', { a: 1 });
  const val = await db.get('test');
  t.deepEqual(val, { a: 1 });
  t.true(ret);
});

test('DB.create returns false if key already exists', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  t.false(await db.create('test', { a: 2 }));
});

test('DB.create throws ValueError when value undefined', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.create('test', undefined as any), ValueError);
});

test('DB.create accepts arbitrary JSONables', async (t) => {
  const { db } = t.context;
  await db.create('test_string', 'hey');
  await db.create('test_number', 7);
  await db.create('test_boolean', true);
  await db.create('test_date', new Date());
  await db.create('test_object', { a: [7] });
  await db.create('test_object', [{ a: 7 }]);
  t.pass();
});

test('DB.remove returns false when no key exists', async (t) => {
  const { db } = t.context;
  t.false(await db.remove('test'));
});

test('DB.remove removes existing key from DB and returns true', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  t.true(await db.remove('test'));
  t.is(await db.get('test'), undefined);
});

test('DB.update creates a new document if key does not exist and returns it', async (t) => {
  const { db } = t.context;
  const next = await db.update<any, { a: number }>('test', (prev) => ({ ...prev, a: 1 }));
  const val = await db.get('test');
  t.deepEqual(val, { a: 1 });
  t.deepEqual(val, next);
});

test('DB.update uses initializer if key does not exist', async (t) => {
  const { db } = t.context;
  await db.update('test', (prev) => ({ ...prev, a: 1 }), { b: 2 });
  const val = await db.get('test');
  t.deepEqual(val, { a: 1, b: 2 });
});

test('DB.update updates an existing document', async (t) => {
  const { db } = t.context;
  await db.create('test', { b: 2 });
  await db.update<{ b: number }, { a: number; b: number }>('test', (prev = { b: 3 }) => ({ ...prev, a: 1 }));
  const val = await db.get('test');
  t.deepEqual(val, { a: 1, b: 2 });
});

test('DB.update ignores initializer on an existing document', async (t) => {
  const { db } = t.context;
  await db.create('test', { b: 2 });
  await db.update('test', (prev) => ({ ...prev, a: 1 }), { c: 3 });
  const val = await db.get('test');
  t.deepEqual(val, { a: 1, b: 2 });
});

test('DB.update throws ValueError if updater returned undefined', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.update('test', () => undefined as any), ValueError);
});
