import anyTest, { TestInterface } from 'ava';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { Handler } from '../db';
import { Context as ConcordContext } from '@reshuffle/interfaces-koa-server';

interface Context {
  ctx: ConcordContext;
  dbDir: string;
  db: Handler;
}

const test = anyTest as TestInterface<Context>;

test.beforeEach(async (t) => {
  const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
  t.context = {
    ctx: {
      debugId: t.title.replace(/^beforeEach hook for /, ''),
      appId: 'test',
      appEnv: 'testing',
      collection: 'default',
      auth: {},
    },
    dbDir,
    db: new Handler(`${dbDir}/root.db`, { items: [{ key: 'initial_data', data: { spam: 'ham' } }] }),
  };
});

test.afterEach(async (t) => {
  await rmrf(t.context.dbDir);
});

test('DB.get gets value from initial data', async (t) => {
  const { ctx, db } = t.context;
  // TODO: creation of new items begins in constructor so there's nothing to await
  // .get()s are not queued the same way as .create()s
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const value = await db.get(ctx, 'initial_data');
  t.deepEqual(value, { spam: 'ham' });
});
