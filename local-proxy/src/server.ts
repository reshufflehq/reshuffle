import { promisify } from 'util';
import { resolve as resolvePath, extname, isAbsolute } from 'path';
import { Handler as DBHandler } from '@reshuffle/leveldb-server';
import { DBRouter } from '@reshuffle/interfaces-koa-server';
import { getHandler, Handler, HandlerError } from '@reshuffle/server-function';
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
import { copy, mkdirpSync } from 'fs-extra';
import env from 'env-var';
import dotenv from 'dotenv';

const tmpDir = env.get('RESHUFFLE_TMP_DIR').required().asString();
mkdirpSync(tmpDir);

const basePath = env.get('RESHUFFLE_DEV_SERVER_BASE_REQUIRE_PATH').required().asString();
const localToken = env.get('RESHUFFLE_DEV_SERVER_LOCAL_TOKEN').required().asString();
if (!localToken) {
  throw new Error('RESHUFFLE_DEV_SERVER_LOCAL_TOKEN env var is empty');
}
if (!isAbsolute(basePath)) {
  throw new Error('RESHUFFLE_DEV_SERVER_BASE_REQUIRE_PATH env var is not an absolute path');
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
  process.env.RESHUFFLE_DB_BASE_URL = `http://localhost:${port}`;
  process.env.RESHUFFLE_APPLICATION_ID = 'local-app';
  process.env.RESHUFFLE_APPLICATION_ENV = 'local';
  process.env.RESHUFFLE_ACCESS_TOKEN = '<unused>';
}

class ModuleWhitelist {
  private readonly whitelistedModulesArr =
    env.get('RESHUFFLE_DEV_SERVER_MODULES_WHITELIST').asArray() || ['@reshuffle/db'];

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

const genDir = mkdtempSync(resolvePath(tmpDir, 'local_proxy_'));

async function transpileAndCopy() {
  await babelDir({
    cliOptions: {
      filenames: [basePath],
      outDir: genDir,
    },
    babelOptions: {
      sourceMaps: true,
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        'module:@reshuffle/code-transform',
      ],
    },
  });
  await copy(basePath, genDir, {
    filter(src) {
      return extname(src) !== '.js';
    },
  });
}

const transpilePromise = transpileAndCopy();
// tslint:disable-next-line:no-console
transpilePromise.catch((error: Error) => console.error(error));

const logDir = process.env.NODE_ENV === 'test' ? resolvePath(basePath, '.reshuffle/logs') :
  resolvePath(os.homedir(), '.reshuffle/logs');
mkdirpSync(logDir);
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
  registry.logger.info(msg, { reqid: requestId, isErr: false, durUs: durationMicro });
  return durationMicro;
}

router.post('/invoke', async (ctx) => {
  if (ctx.get('x-reshuffle-dev-server-local-token') !== localToken) {
    ctx.throw(403, 'bad or missing local token');
    return;
  }
  const startHrtime = process.hrtime();
  const requestId = nanoid();
  // TODO: validate request
  const { path, handler, args } = ctx.request.body;
  registry.register(requestId);
  let fn: Handler;

  try {
    if (whitelisted.has(path)) {
      fn = whitelisted.get(path, handler);
    } else {
      await transpilePromise;
      if (!process.env.RESHUFFLE_DB_BASE_URL) {
        // This can never happen, because POST can only occur after we
        // start listening and set RESHUFFLE_DB_BASE_URL.  Verify it just
        // in case.

        // tslint:disable-next-line:no-console
        console.error('[I] Invoked before local RESHUFFLE_DB_BASE_URL was set; local DB might break');
      }
      fn = getHandler(genDir, path, handler);
    }
    const ret = await fn(...args);
    if (ret === undefined) {
      ctx.status = 204;
      return;
    }
    // ret might be a scalar, which Koa does not auto-JSONify.  So
    // JSON manually.
    ctx.response.type = 'application/json';
    ctx.body = JSON.stringify(ret);
  } catch (err) {
    if (err instanceof HandlerError) {
      ctx.status = err.status;
      ctx.response.body = { error: err.message };
      return;
    }
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke function', err);
    ctx.throw(500, err);
  } finally {
    // Not logging args to avoid sensitive info log (?)
    reportInvocationDurationUs(startHrtime, requestId, { path, handler });
    registry.unregister(requestId);
  }
});

const db = new DBHandler(resolvePath(tmpDir, 'db'));
const dbRouter = new DBRouter(db);
router.use('/v1', dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());

// nodemon uses SIGUSR2
process.once('SIGUSR2', () => {
  rimraf.sync(genDir);
  process.kill(process.pid, 'SIGUSR2');
});

// Handle Ctrl-C in terminal
process.once('SIGINT', () => {
  rimraf.sync(genDir);
  process.kill(process.pid, 'SIGINT');
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = http.createServer(app.callback());
server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address() as AddressInfo;
  registry.logger.info('Listening for HTTP requests', { port });
  await setupEnv({ port });
  // Environment variables are set, can load whitelisted modules.
  whitelisted.loadModules();
  if (process.send) process.send({ type: 'ready', port });
});
