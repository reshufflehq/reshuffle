import anyTest, { ExecutionContext, TestInterface } from 'ava';
import { omit, range } from 'ramda';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { DB, incrVersion } from '../db';
import { hrnano } from '../utils';
import { ServerOnlyContext } from '@binaris/shift-interfaces-koa-server';
import { Serializable } from '@binaris/shift-interfaces-koa-server/interfaces';

interface Context {
  ctx: ServerOnlyContext;
  dbDir: string;
  db: DB;
}

const test = anyTest as TestInterface<Context>;

test.beforeEach(async (t) => {
  const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
  t.context = {
    ctx: { debugId: t.title.replace(/^beforeEach hook for /, '') },
    dbDir,
    db: new DB(`${dbDir}/root.db`),
  };
});

test.afterEach(async (t) => {
  await rmrf(t.context.dbDir);
});

test('DB.get returns undefined when no key exists', async (t) => {
  const { ctx, db } = t.context;
  const value = await db.get(ctx, 'test');
  t.assert(value === undefined);
});

test('DB.create creates a new document, returns true, and sets version to 1', async (t) => {
  const { ctx, db } = t.context;
  const t0 = hrnano();
  const ret = await db.create(ctx, 'test', { a: 1 });
  const doc = await db.getWithMeta(ctx, 'test');
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
  t.true(doc!.version.major >= t0);
  t.is(doc!.version.minor, 1);
  t.true(ret);
});

test('DB.create returns false if key already exists', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test', { a: 1 });
  t.false(await db.create(ctx, 'test', { a: 2 }));
});

test('DB.create throws TypeError when value undefined', async (t) => {
  const { ctx, db } = t.context;
  await t.throwsAsync(db.create(ctx, 'test', undefined as any), {
    instanceOf: TypeError,
    message: /undefined/,
  });
});

test('DB.create throws TypeError when value is a function', async (t) => {
  const { ctx, db } = t.context;
  await t.throwsAsync(db.create(ctx, 'test', () => 17), {
    instanceOf: TypeError,
    message: /function/,
  });
});

test('DB.create throws TypeError when value is a bigint', async (t) => {
  const { ctx, db } = t.context;
  await t.throwsAsync(db.create(ctx, 'test', BigInt(17)), {
    instanceOf: TypeError,
    message: /bigint/,
  });
});

test('DB.create accepts arbitrary JSONables', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test_string', 'hey');
  await db.create(ctx, 'test_number', 7);
  await db.create(ctx, 'test_boolean', true);
  await db.create(ctx, 'test_date', new Date());
  await db.create(ctx, 'test_object', { a: [7] });
  await db.create(ctx, 'test_object', [{ a: 7 }]);
  t.pass();
});

test('DB.remove returns false when no key exists', async (t) => {
  const { ctx, db } = t.context;
  t.false(await db.remove(ctx, 'test'));
});

test('DB.remove returns false when tombstone in key', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test', { a: 1 });
  await db.remove(ctx, 'test');
  t.false(await db.remove(ctx, 'test'));
});

test('DB.remove removes existing key from DB and returns true', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test', { a: 1 });
  t.true(await db.remove(ctx, 'test'));
  t.is(await db.get(ctx, 'test'), undefined);
});

test('DB.remove sets a tombstone with an updatedAt attribute', async (t) => {
  const { ctx, db } = t.context;
  const t0 = hrnano();
  await db.create(ctx, 'test', { a: 1 });
  t.true(await db.remove(ctx, 'test'));
  const doc = await db.getWithMeta(ctx, 'test');
  t.truthy(doc);
  t.assert(! ('value' in doc!));
  t.true(doc!.updatedAt >= t0);
});

// update() tests only on client side.

// Updates key to value.  Assumes no concurrent updates.
async function simpleUpdate(t: ExecutionContext<Context>, key: string, value: Serializable) {
  const { ctx, db } = t.context;
  const { version } = await db.getWithVersion(ctx, key);
  t.true(await db.setIfVersion(ctx, key, version, value));
}

test('DB.poll returns patches which match requested versions', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test1', 'a');
  await db.create(ctx, 'test2', 'a');
  await db.create(ctx, 'test3', 'a');
  await db.create(ctx, 'test4', 'a');
  await db.create(ctx, 'test5', 'a');
  await simpleUpdate(t, 'test1', 'b');
  await simpleUpdate(t, 'test1', 'c');
  await simpleUpdate(t, 'test2', 'b');
  await simpleUpdate(t, 'test2', 'c');
  await simpleUpdate(t, 'test3', 'b');
  await db.remove(ctx, 'test3');
  const [
    major1,
    major2,
    major3,
    major4,
    major5,
  ] = await Promise.all(
    range(1, 5 + 1).map(async (x) => (await db.getWithMeta(ctx, `test${x}`))!.version.major)
  );
  const keyedPatches = await db.poll(ctx, [
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

test('DB.poll returns on update if no new patches stored', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test1', 'a');
  const { version } = (await db.getWithMeta(ctx, 'test1'))!;
  const [keyedPatches] = await Promise.all([
    db.poll(ctx, [['test1', version]]),
    simpleUpdate(t, 'test1', 'b'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: incrVersion(version), ops: [{ op: 'replace', path: '/root', value: 'b' }] },
    ]],
  ]);
});

test('DB.poll returns on remove if no new patches stored', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test1', 'a');
  const { version } = (await db.getWithMeta(ctx, 'test1'))!;
  const [keyedPatches] = await Promise.all([
    db.poll(ctx, [['test1', version]]),
    db.remove(ctx, 'test1'),
  ]);
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version: { major: version.major, minor: 2 }, ops: [{ op: 'remove', path: '/root' }] },
    ]],
  ]);
});

test('DB.poll returns on create if no new patches stored', async (t) => {
  const { ctx, db } = t.context;
  const [keyedPatches] = await Promise.all([
    db.poll(ctx, [['test1', { major: 0, minor: 0 }]]),
    db.create(ctx, 'test1', 'a'),
  ]);
  const { version } = (await db.getWithMeta(ctx, 'test1'))!;
  t.deepEqual(keyedPatches, [
    ['test1', [
      { version, ops: [{ op: 'replace', path: '/root', value: 'a' }] },
    ]],
  ]);
});

test('DB.poll returns empty array when no patches emitted', async (t) => {
  const { ctx, db } = t.context;
  const patches = await db.poll(ctx, [['test1', { major: 0, minor: 0 }]], { readBlockTimeMs: 100 });
  t.deepEqual(patches, []);
});

test('DB.poll returns empty array when patches emitted on different key', async (t) => {
  const { ctx, db } = t.context;
  const [patches] = await Promise.all([
    db.poll(ctx, [['test1', { major: 0, minor: 0 }]], { readBlockTimeMs: 100 }),
    db.create(ctx, 'test2', 'a'),
  ]);
  t.deepEqual(patches, []);
});

test('DB.poll returns empty array when patches emitted on old version', async (t) => {
  const { ctx, db } = t.context;
  const [patches] = await Promise.all([
    db.poll(ctx, [['test1', { major: hrnano() + 10_000_000_000, minor: 0 }]], { readBlockTimeMs: 100 }),
    db.create(ctx, 'test1', 'a'),
  ]);
  t.deepEqual(patches, []);
});

test('DB.create works after remove', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test', 7);
  const { version: initialVersion } = (await db.getWithMeta(ctx, 'test'))!;
  await db.remove(ctx, 'test');
  const t0 = hrnano();
  t.true(await db.create(ctx, 'test', 8));
  const doc = await db.getWithMeta(ctx, 'test');
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
  t.true(doc!.version.major >= t0);
  t.is(doc!.version.minor, 1);
});

test('DB.setIfVersion works after remove but increments version and includes tombstone\'s patches', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'test', 7);
  const { version: initialVersion } = (await db.getWithMeta(ctx, 'test'))!;
  await db.remove(ctx, 'test');
  const t0 = hrnano();
  t.true(await db.setIfVersion(ctx, 'test', incrVersion(initialVersion), 8));
  const doc = await db.getWithMeta(ctx, 'test');
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
  t.true(doc!.version.major >= t0);
  t.is(doc!.version.minor, 1);
});
