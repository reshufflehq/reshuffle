import { resolve as resolvePath, relative as relativePath } from 'path';
import http from 'http';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import bodyParser from 'koa-bodyparser';
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

const whitelistedModulesArr = (process.env.SHIFT_DEV_SERVER_MODULES_WHITELIST || '@binaris/shift-db').split(',');

const whitelistedModules = new Map(
  whitelistedModulesArr.map((name) => {
    try {
      const mod = require(name);
      return [name, mod] as [string, any];
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.error('Could not require whitelisted module', name);
      return undefined;
    }
  }).filter((pair): pair is [string, any] => pair !== undefined)
);

const app = new Koa();
app.use(bodyParser({ enableTypes: ['json'], strict: false }));
const router = new KoaRouter();

const tmpDir = mkdtempSync(resolvePath(basePath, '..', '.shift_local_proxy_'));

const transpilePromise = babelDir({
  cliOptions: {
    filenames: [basePath],
    outDir: tmpDir,
  },
  babelOptions: {
    sourceMaps: true,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
});

// tslint:disable-next-line:no-console
transpilePromise.catch((error: Error) => console.error(error));

const logDir = process.env.NODE_ENV === 'test' ? resolvePath(basePath, '.shiftjs/logs') :
  resolvePath(os.homedir(), '.shiftjs/logs');
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

router.post('/invoke', async (ctx) => {
  if (ctx.get('x-shift-dev-server-local-token') !== localToken) {
    ctx.throw(403, 'bad or missing local token');
    return;
  }
  const startHrtime = process.hrtime();
  const requestId = nanoid();
  // TODO: validate request
  const { path, handler, args } = ctx.request.body;
  registry.register(requestId);
  try {
    let fn: (...args: any[]) => any;
    if (whitelistedModules.has(path)) {
      fn = whitelistedModules.get(path)[handler];
    } else {
      await transpilePromise;
      const joinedDir = resolvePath(tmpDir, path);
      if (relativePath(tmpDir, joinedDir).startsWith('..')) {
        ctx.status = 403;
        ctx.response.body = {
          error: `Cannot reference path outside of root dir: ${path}`,
        };
        return;
      }
      const mod = require(joinedDir);
      fn = mod[handler];
    }
    // TODO: check function is exposed
    const ret = await fn(...args);
    // Not logging args to avoid sensitive info log (?)
    reportInvocationDurationUs(startHrtime, requestId, { path, handler });
    if (ret === undefined) {
      ctx.status = 204;
      return;
    }
    // ret might be a scalar, which Koa does not auto-JSONify.  So
    // JSON manually.
    ctx.response.type = 'application/json';
    ctx.body = JSON.stringify(ret);
  } catch (err) {
    reportInvocationDurationUs(startHrtime, requestId, { path, handler });
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke function', err);
    ctx.throw(500, err);
  } finally {
    registry.unregister(requestId);
  }
});

// nodemon uses SIGUSR2
process.once('SIGUSR2', () => {
  rimraf.sync(tmpDir);
  process.kill(process.pid, 'SIGUSR2');
});

// Handle Ctrl-C in terminal
process.once('SIGINT', () => {
  rimraf.sync(tmpDir);
  process.kill(process.pid, 'SIGINT');
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = http.createServer(app.callback());
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address() as AddressInfo;
  if (process.send) process.send({ type: 'ready', port });
});
