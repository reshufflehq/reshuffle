import anyTest, { TestInterface } from 'ava';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { ServerOnlyContext } from '@binaris/shift-interfaces-koa-server';
import { Direction } from '@binaris/shift-interfaces-koa-server/interfaces';
import { DB } from '../db';

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

test('DB.find returns an empty list when no documents', async (t) => {
  const { ctx, db } = t.context;
  t.deepEqual(await db.find(ctx, { filter: { operator: 'eq', path: ['key'], value: 'abc' } }), []);
});

test('DB.find returns an list of documents', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'abc', { a: 1 });
  t.deepEqual(await db.find(ctx, { filter: { operator: 'eq', path: ['key'], value: 'abc' } }),
              [{ key: 'abc', value: { a: 1 } }]);
});

test('DB.find returns all matching documents', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'a', { a: 1 });
  await db.create(ctx, 'b', { a: 2 });
  await db.create(ctx, 'c', { a: 3 });

  t.deepEqual(await db.find(ctx, { filter: { operator: 'gt', path: ['value', 'a'], value: 1 } }), [
    { key: 'b', value: { a: 2 } },
    { key: 'c', value: { a: 3 } },
  ]);
});

test('DB.find applies limit', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'a', { a: 1 });
  await db.create(ctx, 'b', { a: 2 });
  await db.create(ctx, 'c', { a: 3 });

  t.deepEqual(await db.find(
    ctx,
    { filter: { operator: 'gt', path: ['value', 'a'], value: 0 }, limit: 2 }
  ), [
    { key: 'a', value: { a: 1 } },
    { key: 'b', value: { a: 2 } },
  ]);
});

test('DB.find applies skip', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'a', { a: 1 });
  await db.create(ctx, 'b', { a: 2 });
  await db.create(ctx, 'c', { a: 3 });

  t.deepEqual(await db.find(
    ctx,
    { filter: { operator: 'gt', path: ['value', 'a'], value: 0 }, skip: 1 }
  ), [
    { key: 'b', value: { a: 2 } },
    { key: 'c', value: { a: 3 } },
  ]);
});

test('DB.find applies orderBy', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'a', { a: 1, b: 6 });
  await db.create(ctx, 'b', { a: 2, b: 3 });
  await db.create(ctx, 'c', { a: 3, b: 7 });

  t.deepEqual(await db.find(
    ctx, {
      filter: { operator: 'gt', path: ['value', 'a'], value: 0 },
      skip: 1,
      limit: 1,
      orderBy: [{ path: ['value', 'b'], direction: Direction.ASC }],
    }
  ), [
    { key: 'a', value: { a: 1, b: 6 } },
  ]);
});

test('DB.find ignores tombstones', async (t) => {
  const { ctx, db } = t.context;
  await db.create(ctx, 'a', { a: 1, b: 6 });
  await db.remove(ctx, 'a');

  t.deepEqual(await db.find(ctx, { filter: { operator: 'eq', path: ['key'], value: 'a' } }),
              []);
});
