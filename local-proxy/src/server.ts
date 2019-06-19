import { join as pathJoin } from 'path';
import { inspect } from 'util';
import net from 'net';
import http from 'http';
import express, { json } from 'express';
import { mkdtempSync } from 'fs';
import { walk } from './walker';
import * as rimraf from 'rimraf';

const basePath = process.env.SHIFT_DEV_SERVER_BASE_REQUIRE_PATH;
if (!basePath) {
  throw new Error('SHIFT_DEV_SERVER_BASE_REQUIRE_PATH env var not defined');
}
const localToken = process.env.SHIFT_DEV_SERVER_LOCAL_TOKEN;
if (!localToken) {
  throw new Error('SHIFT_DEV_SERVER_LOCAL_TOKEN env var not defined');
}
const app = express();

let transpiled = false;
let transpilePromise: Promise<void>;
const readyTranspile = async () => {
  if (transpiled) {
    return;
  }
  if (transpilePromise) {
    return await transpilePromise;
  }
  transpilePromise = walk(basePath, tmpDir);
  await transpilePromise;
  transpiled = true;
};

const tmpDir = mkdtempSync(pathJoin(basePath, '.local_proxy_'));

app.post('/invoke', json(), async (req, res) => {
  if (req.headers['x-shift-dev-server-local-token'] !== localToken) {
    return res.sendStatus(403);
  }
  try {
    // TODO: validate request
    const { path, handler, args } = req.body;
    await readyTranspile();
    // Make sure we use tmpDir as absolute path
    const mod = require(pathJoin(tmpDir, path));
    const fn = mod[handler];
    // TODO: check function is exposed
    const ret = await fn(...args);
    if (ret === undefined) {
      return res.sendStatus(204);
    }
    res.json(ret);
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke function', err);
    res.status(500).json({ error: inspect(err) });
  }
});

if (process.send) process.send('ready');
process.on('message', (m, netServer) => {
  if (m === 'server') {
    const httpServer = http.createServer(app);
    (netServer as net.Server).on('connection', (socket) => httpServer.emit('connection', socket));
  }
});

// nodemon uses SIGUSR2
process.once('SIGUSR2', () => {
  rimraf.sync(tmpDir);
  process.kill(process.pid, 'SIGUSR2');
});
