import { promisify } from 'util';
import { resolve as resolvePath, relative as relativePath, extname, isAbsolute } from 'path';
import { Handler as DBHandler } from '@binaris/shift-leveldb-server';
import { DBRouter } from '@binaris/shift-interfaces-koa-server';
import http from 'http';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { mkdtempSync, readFile } from 'fs';
import * as rimraf from 'rimraf';
import babelDir from '@babel/cli/lib/babel/dir';
import { AddressInfo } from 'net';
import os from 'os';
import { initRegistry } from './stdio';
import nanoid from 'nanoid';
import mkdirp from 'mkdirp';
import { copy } from 'fs-extra';
import env from 'env-var';
import dotenv from 'dotenv';

const basePath = env.get('SHIFT_DEV_SERVER_BASE_REQUIRE_PATH').required().asString();
const localToken = env.get('SHIFT_DEV_SERVER_LOCAL_TOKEN').required().asString();
if (!localToken) {
  throw new Error('SHIFT_DEV_SERVER_LOCAL_TOKEN env var is empty');
}
if (!isAbsolute(basePath)) {
  throw new Error('SHIFT_DEV_SERVER_BASE_REQUIRE_PATH env var is not an absolute path');
}

async function loadDotEnv() {
  const envFile = resolvePath(basePath, '.env');
  try {
    const content = await promisify(readFile)(envFile);
    const parsed = dotenv.parse(content);
    for (const [k, v] of Object.entries(parsed)) {
      process.env[k] = v;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

async function setupEnv({ port }: { port: number }) {
  await loadDotEnv();
  process.env.SHIFT_DB_BASE_URL = `http://localhost:${port}`;
  process.env.SHIFT_APPLICATION_ID = 'local-app';
  process.env.SHIFT_APPLICATION_ENV = 'local';
  process.env.SHIFT_ACCESS_TOKEN = '<unused>';
}

class ModuleWhitelist {
  private readonly whitelistedModulesArr =
    env.get('SHIFT_DEV_SERVER_MODULES_WHITELIST').asArray() || ['@binaris/shift-db'];

  private whitelistedModules?: Map<string, any>;

  /**
   * Loads modules with settings from environment variables.
   */
  public loadModules() {
    this.whitelistedModules = new Map(
      this.whitelistedModulesArr.map((name) => {
        try {
          const mod = require(name);
          return [name, mod] as [string, any];
        } catch (err) {
          // tslint:disable-next-line:no-console
          console.error('Could not require whitelisted module', name);
          return undefined;
        }
      }).filter((pair): pair is [string, any] => pair !== undefined));
  }

  // Returns true if module on path is whitelisted.
  public has(path: string): boolean {
    return this.whitelistedModules!.has(path);
  }

  // Returns handler on module at path.
  public get(path: string, handler: string) {
    return this.whitelistedModules!.get(path)![handler];
  }
}

const whitelisted = new ModuleWhitelist();

const app = new Koa();
app.use(bodyParser({ enableTypes: ['json'], strict: false }));
const router = new KoaRouter();

const tmpDir = mkdtempSync(resolvePath(basePath, '..', '.shift_local_proxy_'));

async function transpileAndCopy() {
  await babelDir({
    cliOptions: {
      filenames: [basePath],
      outDir: tmpDir,
    },
    babelOptions: {
      sourceMaps: true,
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        'module:@binaris/shift-code-transform',
      ],
    },
  });
  await copy(basePath, tmpDir, {
    filter(src) {
      return extname(src) !== '.js';
    },
  });
}

const transpilePromise = transpileAndCopy();
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
    if (whitelisted.has(path)) {
      fn = whitelisted.get(path, handler);
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
      if (!process.env.SHIFT_DB_BASE_URL) {
        // This can never happen, because POST can only occur after we
        // start listening and set SHIFT_DB_BASE_URL.  Verify it just
        // in case.

        // tslint:disable-next-line:no-console
        console.error('[I] Invoked before local SHIFT_DB_BASE_URL was set; local DB might break');
      }
      const mod = require(joinedDir);
      fn = mod[handler];
      // Cast to any so typescript doesn't complain against accessing __shiftjs__ on a function
      if (!(typeof fn === 'function' && (fn as any).__shiftjs__ && (fn as any).__shiftjs__.exposed)) {
        ctx.status = 403;
        ctx.response.body = {
          error: `Cannot invoke ${path}.${handler} - not an exposed function`,
        };
        return;
      }
    }
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

const dbPath = env.get('SHIFT_DB_PATH').required().asString();
if (!isAbsolute(dbPath)) {
  throw new Error('SHIFT_DB_PATH env var is not an absolute path');
}

const db = new DBHandler(dbPath);
const dbRouter = new DBRouter(db);
router.use('/v1', dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());

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
server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address() as AddressInfo;
  await setupEnv({ port });
  // Environment variables are set, can load whitelisted modules.
  whitelisted.loadModules();
  if (process.send) process.send({ type: 'ready', port });
});
