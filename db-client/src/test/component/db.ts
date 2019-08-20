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
  client: DBHandler,
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

test.before(async (t) => {
  const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
  const db = new DB(`${dbDir}/root.db`);
  const dbRouter = new DBRouter(db, true);
  const router = new KoaRouter();
  router.use('/v1', dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());
  const app = new Koa();
  app.use(router.routes());
  app.use(router.allowedMethods());

  const server = await listenOn(app);
  const port = (server.address() as unknown as AddressInfo).port
  const url = `http://localhost:${port}`;
  process.env.DB_BASE_URL = url;
  // Instantiate DBHandler with proper URL set up.
  const client = new DBHandler({ timeoutMs: 1000 });
  t.context = {
    dbDir,
    client
  };
});

test.after(async (t) => {
  await rmrf(t.context.dbDir);
});

test('DB.get returns undefined when no key exists', async (t) => {
  const { client } = t.context;
  const value = await client.get('test');
  t.assert(value === undefined);
});
