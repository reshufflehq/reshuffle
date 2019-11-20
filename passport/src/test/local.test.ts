// Tests the local fake auth serving logic, and that general wiring works.

import anyTest, { TestInterface } from 'ava';
import { createAuthHandler } from '../auth-handler';
import express = require('express');
import * as http from 'http';
import { AddressInfo } from 'net';
import got  = require('got');

// Returns port of listening app.
async function listen(app: express.Application): Promise<AddressInfo> {
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, resolve);
    server.once('error', reject);
  });
  return server.address() as unknown as AddressInfo;
}

interface TestContext {
  port: number;
}

const test = anyTest as TestInterface<TestContext>;

test.beforeEach(async (t) => {
  const app = express();
  app.use(createAuthHandler());
  const { port } = await listen(app);
  t.context.port = port;
});

test('local auth serves login page', async (t) => {
  const res = await got(`http://localhost:${t.context.port}/login`);
  t.is(res.statusCode, 200);
  t.true(res.headers['content-type']!.startsWith('text/html'), res.headers['content-type']);
  t.true(res.body.includes('Mock Login Page'), res.body);
});

test('local auth logs in successfully', async (t) => {
  const res = await got.post(
    `http://localhost:${t.context.port}/login`, {
      form: true, body: { username: 'ok user', password: 's3cr3t' }, throwHttpErrors: false,
    });
  t.is(res.statusCode, 302);
  t.is(res.headers.location, '/');
});

test('local auth fails to log in', async (t) => {
  const res = await got.post(
    `http://localhost:${t.context.port}/login`, {
      form: true, body: { username: 'fail user', password: 'wr0ng' }, throwHttpErrors: false,
    });
  t.is(res.statusCode, 302);
  t.is(res.headers.location, '/login');
});
