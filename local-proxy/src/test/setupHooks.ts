import { TestInterface } from 'ava';
import express from 'express';
import path from 'path';
import http from 'http';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { AddressInfo } from 'net';
import { setupProxy } from '../index';
import { copy, remove } from 'fs-extra';
import nodemon from 'nodemon';
import { config } from '@reshuffle/project-config';

export interface LocalProxyTestInterface {
  port: number;
  server: http.Server;
  workdir: string;
  stderr: string[];
  stdout: string[];
}

// TODO: each file setups a single test since nodemon must be used in exactly one proces
export function setupTestHooks(test: TestInterface<LocalProxyTestInterface>) {
  test.beforeEach(async (t) => {
    const app = express();
    const workdir = await fs.mkdtemp(`${tmpdir()}/.reshuffle-local-proxy-test`, 'utf8');
    t.context.workdir = workdir;
    await copy(path.join(__dirname, 'fixture'), workdir);
    setupProxy(path.join(workdir, config.backendDirectory))(app);
    t.context.stderr = [];
    t.context.stdout = [];
    nodemon.on('readable', function(this: any) {
      this.stderr.on('data', (chunk: string | Buffer) => t.context.stderr.push(chunk.toString()));
      this.stdout.on('data', (chunk: string | Buffer) => t.context.stdout.push(chunk.toString()));
    });
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
