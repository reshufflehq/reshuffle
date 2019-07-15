import { join as pathJoin } from 'path';
import { inspect } from 'util';
import http from 'http';
import express, { json } from 'express';
import { mkdtempSync } from 'fs';
import * as rimraf from 'rimraf';
import babelDir from '@babel/cli/lib/babel/dir';
import { AddressInfo } from 'net';
import os from 'os';
import { initRegistry } from './stdio';
import nanoid from 'nanoid';
import mkdirp from 'mkdirp';

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

const transpilePromise = babelDir({
  cliOptions: {
    filenames: [basePath],
    outDir: tmpDir,
  },
  babelOptions: {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
});

// tslint:disable-next-line:no-console
transpilePromise.catch((error: Error) => console.error(error));

const logDir = process.env.NODE_ENV === 'test' ? pathJoin(basePath, '.shiftjs/logs') :
  pathJoin(os.homedir(), '.shiftjs/logs');
mkdirp.sync(logDir);
const registry = initRegistry(logDir);

interface MethodInfo {
  path: string;
  handler: string;
}

function reportInvocationDurationUs(startTime: [number, number], requestId: string, method: MethodInfo): number {
  const [durationSec, durationNano] = process.hrtime(startTime);
  const NS_PER_SEC = 1e9;
  const totalDurationNano = durationSec * NS_PER_SEC + durationNano;
  const durationMicro = totalDurationNano / 1e3;
  const msg = `Function ${method.path}:${method.handler} invocation took ${durationMicro} us\n`;
  registry.logger.info({ reqid: requestId, isErr: false, durUs: durationMicro }, msg);
  return durationMicro;
}

app.post('/invoke', json(), async (req, res) => {
  if (req.headers['x-shift-dev-server-local-token'] !== localToken) {
    return res.sendStatus(403);
  }
  const startHrtime = process.hrtime();
  const requestId = nanoid();
  // TODO: validate request
  const { path, handler, args } = req.body;
  registry.register(requestId);
  try {
    let fn: (...args: any[]) => any;
    if (path === '@binaris/shift-db' && (handler === 'getVersioned' || handler === 'poll')) {
      fn = require(path)[handler];
    } else {
      await transpilePromise;
      // Make sure we use tmpDir as absolute path
      const mod = require(pathJoin(tmpDir, path));
      fn = mod[handler];
    }
    // TODO: check function is exposed
    const ret = await fn(...args);
    // Not logging args to avoid sensitive info log (?)
    reportInvocationDurationUs(startHrtime, requestId, { path, handler });
    if (ret === undefined) {
      return res.sendStatus(204);
    }
    res.json(ret);
  } catch (err) {
    reportInvocationDurationUs(startHrtime, requestId, { path, handler });
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke function', err);
    res.status(500).json({ error: inspect(err) });
  } finally {
    registry.unregister(requestId);
  }
});

// nodemon uses SIGUSR2
process.once('SIGUSR2', () => {
  rimraf.sync(tmpDir);
  process.kill(process.pid, 'SIGUSR2');
});

const server = http.createServer(app);
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address() as AddressInfo;
  if (process.send) process.send({ type: 'ready', port });
});
