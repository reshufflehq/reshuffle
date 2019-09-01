import * as http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { setupProxy } from '../index';
import test from 'ava';
import path from 'path';
import got from 'got';
import { range } from 'lodash';

// This test should be considered NOT flaky
// This means that if a test run fails there is most likely a bug in the code
test('Regression #36', async (t) => {
  t.timeout(10000);
  const app = express();
  setupProxy(path.join(__dirname, 'fixture/backend'))(app);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  const responses = await Promise.all(
    range(100).map(() => got.post(`http://127.0.0.1:${port}/invoke`, {
      headers: {
        origin: 'localhost',
      },
      body: { path: 'dummyBackend.js', args: [], handler: 'hello', },
      json: true,
    }))
  );
  t.is(responses.length, 100);
  t.assert(responses.every((elem) => elem.body === 'hello'));
});
