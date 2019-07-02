import * as http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { setupProxy } from '../index';
import test from 'ava';
import path from 'path';
import got from 'got';

// This test should be considered NOT flaky
// This means that if a test run fails there is most likely a bug in the code
test('Flaky http proxy', async (t) => {
  t.timeout(10000);
  const app = express();
  setupProxy(path.join(__dirname, 'fixture/backend'))(app);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  const requests = [];
  for (let i = 0; i < 100; i++) {
    const req = got.post(`http://127.0.0.1:${port}/invoke`, {
      body: { path: 'dummyBackend.js', args: [], handler: 'hello', },
      json: true,
    });
    requests.push(req);
  }
  const responses = await Promise.all(requests);
  t.assert(responses.every((elem) => elem.body === 'hello'));
  t.pass();
});
