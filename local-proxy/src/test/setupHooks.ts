import { TestInterface } from 'ava';
import express from 'express';
import path from 'path';
import http from 'http';
import { AddressInfo } from 'net';
import { setupProxy } from '../index';

export interface LocalProxyTestInterface {
  port: number;
  server: http.Server;
}

// TODO: each file setups a single test since nodemon must be used in exactly one proces
export function setupTestHooks(test: TestInterface<LocalProxyTestInterface>) {
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
}
