import anyTest, { TestInterface } from 'ava';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { DB, KeyAlreadyExistsError, KeyError } from '../db';

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

test('DB.get throws KeyError when no key exists', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.get('test'), KeyError);
});

test('DB.create creates a new document', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  const val = await db.get('test');
  t.deepEqual(val, { a: 1 });
});

test('DB.create throws KeyAlreadyExistsError if key already exists', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  await t.throwsAsync(db.create('test', { a: 2 }), KeyAlreadyExistsError);
});

test('DB.update creates a new document if key does not exist', async (t) => {
  const { db } = t.context;
  await db.update('test', (prev) => ({ ...prev, a: 1 }));
  const val = await db.get('test');
  t.deepEqual(val, { a: 1 });
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
  await db.update('test', (prev) => ({ ...prev, a: 1 }));
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

test('DB.remove throws KeyError when no key exists', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.remove('test'), KeyError);
});

test('DB.remove removes existing key from DB', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  await db.remove('test');
  await t.throwsAsync(db.get('test'), KeyError);
});
