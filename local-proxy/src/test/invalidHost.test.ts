import * as http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { setupProxy } from '../index';
import anyTest, { TestInterface } from 'ava';
import path from 'path';
import got from 'got';

const test = anyTest as TestInterface<{
  port: number,
  server: http.Server,
}>;

// TODO: duplicate between files due to nodemon requiring to be used in exactly one process
test.beforeEach(async (t) => {
  const app = express();
  setupProxy(path.join(__dirname, 'fixture/backend'))(app);
  const server = t.context.server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  t.context.port = port;
});

test.afterEach.always((t) => {
  t.context.server.close();
});

test('Invalid Host', async (t) => {
  const reqPromise = got.post(`http://127.0.0.1:${t.context.port}/invoke`, {
    headers: {
      host: 'evil.com',
    },
    body: { path: 'dummyBackend.js', args: [], handler: 'hello', },
    json: true,
  });
  await t.throwsAsync(reqPromise, 'Response code 403 (Forbidden)');
});
