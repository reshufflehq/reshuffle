import anyTest, { TestInterface } from 'ava';
import { omit, range } from 'ramda';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { DB, incrVersion } from '../db';
import { hrnano } from '../utils';

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
  const t0 = hrnano();
  const ret = await db.create('test', { a: 1 });
  const doc = await db.getWithMeta('test');
  t.deepEqual(omit(['updatedAt', 'version'], doc), {
    value: { a: 1 },
    patches: [
      {
        version: doc!.version,
        ops: [{ op: 'replace', path: '/root', value: { a: 1 } }],
      },
    ],
  });
  t.true(doc!.updatedAt >= t0);
  t.true(doc!.version[0] >= t0);
  t.is(doc!.version[1], 1);
  t.true(ret);
});

test('DB.create returns false if key already exists', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  t.false(await db.create('test', { a: 2 }));
});

test('DB.create throws TypeError when value undefined', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.create('test', undefined as any), {
    instanceOf: TypeError,
    message: /undefined/,
  });
});

test('DB.create throws TypeError when value is a function', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.create('test', () => 17), {
    instanceOf: TypeError,
    message: /function/,
  });
});

test('DB.create throws TypeError when value is a bigint', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.create('test', BigInt(17)), {
    instanceOf: TypeError,
    message: /bigint/,
  });
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

test('DB.remove returns false when tombstone in key', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1 });
  await db.remove('test');
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
  const t0 = hrnano();
  await db.create('test', { a: 1 });
  t.true(await db.remove('test'));
  const doc = await db.getWithMeta('test');
  t.is(doc!.value, undefined);
  t.true(doc!.updatedAt >= t0);
});

test('DB.update creates a new document if key does not exist, returns it, sets version to 1', async (t) => {
  const { db } = t.context;
  const t0 = hrnano();
  const next = await db.update('test', (prev) => ({ ...prev, a: 1 }));
  const { value, version } = (await db.getWithMeta('test'))!;
  t.deepEqual(value, { a: 1 });
  t.deepEqual(next, value);
  t.true(version[0] >= t0);
  t.is(version[1], 1);
});

test('DB.update updates an existing document, returns it, and increments version', async (t) => {
  const { db } = t.context;
  await db.create('test', { b: 2 });
  const { version: firstVersion } = (await db.getWithMeta('test'))!;
  const next = await db.update('test', (prev) => ({ ...prev, a: 1 }));
  const { value, version } = (await db.getWithMeta('test'))!;
  t.deepEqual(value, { a: 1, b: 2 });
  t.deepEqual(next, value);
  t.deepEqual(version, incrVersion(firstVersion));
});

test('DB.update does nothing if document not updated', async (t) => {
  const { db } = t.context;
  await db.create('test', { b: 2 });
  const { version: firstVersion } = (await db.getWithMeta('test'))!;
  const next = await db.update('test', (prev) => ({ ...prev }));
  const { value, version } = (await db.getWithMeta('test'))!;
  t.deepEqual(value, { b: 2 });
  t.deepEqual(next, value);
  t.deepEqual(version, firstVersion);
});

test('DB.poll returns patches which match requested versions', async (t) => {
  const { db } = t.context;
  await db.create('test1', 'a');
  await db.create('test2', 'a');
  await db.create('test3', 'a');
  await db.create('test4', 'a');
  await db.create('test5', 'a');
  await db.update('test1', () => 'b');
  await db.update('test1', () => 'c');
  await db.update('test2', () => 'b');
  await db.update('test2', () => 'c');
  await db.update('test3', () => 'b');
  await db.remove('test3');
  const [
    major1,
    major2,
    major3,
    major4,
    major5,
  ] = await Promise.all(
    range(1, 5 + 1).map(async (x) => (await db.getWithMeta(`test${x}`))!.version[0])
  );
  const keyedPatches = await db.poll([
    ['test1', [major1, 1]],
    ['test2', [major2, 2]],
    ['test3', [major3, 1]],
    ['test4', [major4, 1]],
    ['test5', [major5, 0]],
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: [major1, 2], ops: [{ op: 'replace', path: '/root', value: 'b' }] },
      { version: [major1, 3], ops: [{ op: 'replace', path: '/root', value: 'c' }] },
    ]],
    ['test2', [
      { version: [major2, 3], ops: [{ op: 'replace', path: '/root', value: 'c' }] },
    ]],
    ['test3', [
      { version: [major3, 2], ops: [{ op: 'replace', path: '/root', value: 'b' }] },
      { version: [major3, 3], ops: [{ op: 'remove', path: '/root' }] },
    ]],
    ['test5', [
      { version: [major5, 1], ops: [{ op: 'replace', path: '/root', value: 'a' }] },
    ]],
  ]);
});

test('DB.poll returns on update if no new patches stored', async (t) => {
  const { db } = t.context;
  await db.create('test1', 'a');
  const { version } = (await db.getWithMeta('test1'))!;
  const [keyedPatches] = await Promise.all([
    db.poll([['test1', version]]),
    db.update('test1', () => 'b'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: incrVersion(version), ops: [{ op: 'replace', path: '/root', value: 'b' }] },
    ]],
  ]);
});

test('DB.poll returns on remove if no new patches stored', async (t) => {
  const { db } = t.context;
  await db.create('test1', 'a');
  const { version } = (await db.getWithMeta('test1'))!;
  const [keyedPatches] = await Promise.all([
    db.poll([['test1', version]]),
    db.remove('test1'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: [version[0], 2], ops: [{ op: 'remove', path: '/root' }] },
    ]],
  ]);
});

test('DB.poll returns on create if no new patches stored', async (t) => {
  const { db } = t.context;
  const [keyedPatches] = await Promise.all([
    db.poll([['test1', [0, 0]]]),
    db.create('test1', 'a'),
  ]);
  const { version } = (await db.getWithMeta('test1'))!;
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version, ops: [{ op: 'replace', path: '/root', value: 'a' }] },
    ]],
  ]);
});

test('DB.poll returns empty array when no patches emitted', async (t) => {
  const { db } = t.context;
  const patches = await db.poll([['test1', [0, 0]]], { readBlockTimeMs: 100 });
  t.deepEqual(patches, []);
});

test('DB.poll returns empty array when patches emitted on different key', async (t) => {
  const { db } = t.context;
  const [patches] = await Promise.all([
    db.poll([['test1', [0, 0]]], { readBlockTimeMs: 100 }),
    db.create('test2', 'a'),
  ]);
  t.deepEqual(patches, []);
});

test('DB.poll returns empty array when patches emitted on old version', async (t) => {
  const { db } = t.context;
  const [patches] = await Promise.all([
    db.poll([['test1', [hrnano() + 10_000_000_000, 0]]], { readBlockTimeMs: 100 }),
    db.create('test1', 'a'),
  ]);
  t.deepEqual(patches, []);
});

test('DB.create works after remove', async (t) => {
  const { db } = t.context;
  await db.create('test', 7);
  const { version: initialVersion } = (await db.getWithMeta('test'))!;
  await db.remove('test');
  const t0 = hrnano();
  t.true(await db.create('test', 8));
  const doc = await db.getWithMeta('test');
  t.deepEqual(omit(['updatedAt', 'version'], doc), {
    value: 8,
    patches: [
      {
        version: initialVersion,
        ops: [{ op: 'replace', path: '/root', value: 7 }],
      },
      {
        version: incrVersion(initialVersion),
        ops: [{ op: 'remove', path: '/root' }],
      },
      {
        version: doc!.version,
        ops: [{ op: 'replace', path: '/root', value: 8 }],
      },
    ],
  });
  t.true(doc!.updatedAt >= t0);
  t.true(doc!.version[0] >= t0);
  t.is(doc!.version[1], 1);
});

test('DB.update works after remove but increments version and includes tombstone\'s patches', async (t) => {
  const { db } = t.context;
  await db.create('test', 7);
  const { version: initialVersion } = (await db.getWithMeta('test'))!;
  await db.remove('test');
  const t0 = hrnano();
  const val = await db.update('test', () => 8);
  t.is(val, 8);
  const doc = await db.getWithMeta('test');
  t.deepEqual(omit(['updatedAt', 'version'], doc), {
    value: 8,
    patches: [
      {
        version: initialVersion,
        ops: [{ op: 'replace', path: '/root', value: 7 }],
      },
      {
        version: incrVersion(initialVersion),
        ops: [{ op: 'remove', path: '/root' }],
      },
      {
        version: doc!.version,
        ops: [{ op: 'replace', path: '/root', value: 8 }],
      },
    ],
  });
  t.true(doc!.updatedAt >= t0);
  t.true(doc!.version[0] >= t0);
  t.is(doc!.version[1], 1);
});

test('DB.update throws TypeError if updater returned undefined', async (t) => {
  const { db } = t.context;
  await t.throwsAsync(db.update('test', () => undefined as any), TypeError);
});

test('DB.update throws TypeError if trying to modify returned object', async (t) => {
  const { db } = t.context;
  await db.create('test', { a: 1, b: { c: 2, d: [5] } });
  await t.throwsAsync(db.update('test', (obj) => {
    (obj as any).a = 2;
    return obj;
  }), TypeError);
  await t.throwsAsync(db.update('test', (obj) => {
    (obj as any).b.c = 3;
    return obj;
  }), TypeError);
  await t.throwsAsync(db.update('test', (obj) => {
    (obj as any).b.d[0] = 6;
    return obj;
  }), TypeError);
});
