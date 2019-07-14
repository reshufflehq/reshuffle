import anyTest, { TestInterface } from 'ava';
import { omit } from 'ramda';
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

test('DB.create creates a new document, returns true, and sets version to 1', async (t) => {
  const { db } = t.context;
  const t0 = Date.now();
  const ret = await db.create('test', { a: 1 });
  const doc = await db.getWithMeta('test');
  t.deepEqual(omit(['updatedAt'], doc), { value: { a: 1 }, version: 1, patches: [] });
  t.true(doc!.updatedAt >= t0);
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

test('DB.remove sets a tombstone with an updatedAt attribute', async (t) => {
  const { db } = t.context;
  const t0 = Date.now();
  await db.create('test', { a: 1 });
  t.true(await db.remove('test'));
  const doc = await db.getWithMeta('test');
  t.is(doc!.value, undefined);
  t.true(doc!.updatedAt >= t0);
});

test('DB.update creates a new document if key does not exist, returns it, sets version to 1', async (t) => {
  const { db } = t.context;
  const next = await db.update('test', (prev) => ({ ...prev, a: 1 }));
  const { value, version } = (await db.getWithMeta('test'))!;
  t.deepEqual(value, { a: 1 });
  t.deepEqual(next, value);
  t.is(version, 1);
});

test('DB.update updates an existing document, returns it, and increments version', async (t) => {
  const { db } = t.context;
  await db.create('test', { b: 2 });
  const next = await db.update('test', (prev) => ({ ...prev, a: 1 }));
  const { value, version } = (await db.getWithMeta('test'))!;
  t.deepEqual(value, { a: 1, b: 2 });
  t.deepEqual(next, value);
  t.is(version, 2);
});

test('DB.update does nothing if document not updated', async (t) => {
  const { db } = t.context;
  await db.create('test', { b: 2 });
  const next = await db.update('test', (prev) => ({ ...prev }));
  const { value, version } = (await db.getWithMeta('test'))!;
  t.deepEqual(value, { b: 2 });
  t.deepEqual(next, value);
  t.is(version, 1);
});

test('DB.poll returns patches which match requested versions', async (t) => {
  const { db } = t.context;
  await db.create('test1', 'a');
  await db.create('test2', 'a');
  await db.create('test3', 'a');
  await db.create('test4', 'a');
  await db.update('test1', () => 'b');
  await db.update('test1', () => 'c');
  await db.update('test2', () => 'b');
  await db.update('test2', () => 'c');
  await db.update('test3', () => 'b');
  await db.remove('test3');
  const keyedPatches = await db.poll([
    ['test1', 1], ['test2', 2], ['test3', 1], ['test4', 1],
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: 2, ops: [{ op: 'replace', path: '/root', value: 'b' }] },
      { version: 3, ops: [{ op: 'replace', path: '/root', value: 'c' }] },
    ]],
    ['test2', [
      { version: 3, ops: [{ op: 'replace', path: '/root', value: 'c' }] },
    ]],
    ['test3', [
      { version: 2, ops: [{ op: 'replace', path: '/root', value: 'b' }] },
      { version: 3, ops: [{ op: 'remove', path: '/root' }] },
    ]],
  ]);
});

test('DB.poll returns on update if no new patches stored', async (t) => {
  const { db } = t.context;
  await db.create('test1', 'a');
  const [keyedPatches] = await Promise.all([
    db.poll([['test1', 1]]),
    db.update('test1', () => 'b'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: 2, ops: [{ op: 'replace', path: '/root', value: 'b' }] },
    ]],
  ]);
});

test('DB.poll returns on remove if no new patches stored', async (t) => {
  const { db } = t.context;
  await db.create('test1', 'a');
  const [keyedPatches] = await Promise.all([
    db.poll([['test1', 1]]),
    db.remove('test1'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: 2, ops: [{ op: 'remove', path: '/root' }] },
    ]],
  ]);
});

test('DB.create works after remove', async (t) => {
  const { db } = t.context;
  const t0 = Date.now();
  await db.create('test', 7);
  await db.remove('test');
  t.true(await db.create('test', 8));
  const doc = await db.getWithMeta('test');
  t.deepEqual(omit(['updatedAt'], doc), {
    version: 1,
    value: 8,
    patches: [],
  });
  t.true(doc!.updatedAt >= t0);
});

test('DB.update works after remove but increments version and includes delete patch', async (t) => {
  const { db } = t.context;
  const t0 = Date.now();
  await db.create('test', 7);
  await db.remove('test');
  const val = await db.update('test', () => 8);
  t.is(val, 8);
  const doc = await db.getWithMeta('test');
  t.deepEqual(omit(['updatedAt'], doc), {
    version: 3,
    value: 8,
    patches: [
      {
        version: 2,
        ops: [{ op: 'remove', path: '/root' }],
      },
      {
        version: 3,
        ops: [{ op: 'replace', path: '/root', value: 8 }],
      },
    ],
  });
  t.true(doc!.updatedAt >= t0);
});

test('DB.update throws ValueError if updater returned undefined', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.update('test', () => undefined as any), ValueError);
});

test('DB.update throws TypeError if trying to modify returned object', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1, b: { c: 2, d: [5] } });
  await t.throwsAsync(db.update('test', (obj) => {
    obj.a = 2;
    return obj;
  }), TypeError);
  await t.throwsAsync(db.update('test', (obj) => {
    obj.b.c = 3;
    return obj;
  }), TypeError);
  await t.throwsAsync(db.update('test', (obj) => {
    obj.b.d[0] = 6;
    return obj;
  }), TypeError);
});
