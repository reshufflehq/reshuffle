// Tests the local fake auth serving logic, and that general wiring works.

import test from 'ava';
import { mw as authMw } from '../auth-handler';
import express = require('express');
import got  = require('got');

test('local auth serves login page', async (t) => {
  const app = express();
  app.use(authMw());

  const res = await got('http://localhost/login');
  t.is(res.statusCode, 200);
  t.is(res.headers['content-type'], 'text/html');
});
