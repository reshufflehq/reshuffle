import { TestInterface } from 'ava';
import express from 'express';
import path from 'path';
import http from 'http';
import fs from 'mz/fs';
import { tmpdir } from 'os';
import { AddressInfo } from 'net';
import { setupProxy } from '../index';
import { copy, remove } from 'fs-extra';

export interface LocalProxyTestInterface {
  port: number;
  server: http.Server;
  workdir: string;
}

// TODO: each file setups a single test since nodemon must be used in exactly one proces
export function setupTestHooks(test: TestInterface<LocalProxyTestInterface>) {
  test.beforeEach(async (t) => {
    const app = express();
    const workdir = await fs.mkdtemp(`${tmpdir()}/.reshuffle-local-proxy-test`, 'utf8');
    t.context.workdir = workdir;
    await copy(path.join(__dirname, 'fixture'), workdir);
    setupProxy(path.join(workdir, 'backend'))(app);
    const server = t.context.server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    t.context.port = port;
  });
  test.afterEach.always(async (t) => {
    t.context.server.close();
    await remove(t.context.workdir);
  });
}
