import { join as pathJoin } from 'path';
import { inspect } from 'util';
import net from 'net';
import http from 'http';
import express, { json } from 'express';
import { mkdtempSync } from 'fs';
import * as rimraf from 'rimraf';
import babel from '@babel/cli/lib/babel/dir';

const basePath = process.env.SHIFT_DEV_SERVER_BASE_REQUIRE_PATH;
if (!basePath) {
  throw new Error('SHIFT_DEV_SERVER_BASE_REQUIRE_PATH env var not defined');
}
const localToken = process.env.SHIFT_DEV_SERVER_LOCAL_TOKEN;
if (!localToken) {
  throw new Error('SHIFT_DEV_SERVER_LOCAL_TOKEN env var not defined');
}
const app = express();

const tmpDir = mkdtempSync(pathJoin(basePath, '..', '.shift_local_proxy_'));

const transpilePromise = babel({
  cliOptions: {
    filenames: [basePath],
    outDir: tmpDir,
  },
  babelOptions: {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
});

transpilePromise.catch((error: Error) => console.error(error));

app.post('/invoke', json(), async (req, res) => {
  if (req.headers['x-shift-dev-server-local-token'] !== localToken) {
    return res.sendStatus(403);
  }
  try {
    // TODO: validate request
    const { path, handler, args } = req.body;
    await transpilePromise;
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

// nodemon uses SIGUSR2
process.once('SIGUSR2', () => {
  rimraf.sync(tmpDir);
  process.kill(process.pid, 'SIGUSR2');
});

process.on('message', (m, netServer) => {
  if (m === 'server') {
    const httpServer = http.createServer(app);
    (netServer as net.Server).on('connection', (socket) => httpServer.emit('connection', socket));
  }
});

if (process.send) process.send('ready');
