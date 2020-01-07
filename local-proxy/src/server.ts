import { promisify } from 'util';
import { resolve as resolvePath, extname } from 'path';
import { Handler as DBHandler } from '@reshuffle/leveldb-server';
import { DBRouter } from '@reshuffle/interfaces-koa-server';
import { getInvokeHandler, getHTTPHandler, HTTPHandler, setHTTPHandler } from '@reshuffle/server-function';
import http from 'http';
import express from 'express';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import { mkdtempSync, readFile, readFileSync, existsSync } from 'fs';
import * as rimraf from 'rimraf';
import babelDir from '@babel/cli/lib/babel/dir';
import { AddressInfo } from 'net';
import os from 'os';
import { initRegistry } from './stdio';
import nanoid from 'nanoid';
import { copy, mkdirpSync } from 'fs-extra';
import env from 'env-var';
import dotenv from 'dotenv';
import proxy from 'http-proxy';

const envStr = (name: string): string => {
  const val = env.get(name).required().asString();
  if (val === '') {
    throw new Error(`${name} is env var is empty`);
  }
  return val;
};

const tmpDir = envStr('RESHUFFLE_TMP_DIR');
mkdirpSync(tmpDir);

const rootPath = envStr('RESHUFFLE_DEV_SERVER_ROOT_DIR');
const basePath = envStr('RESHUFFLE_DEV_SERVER_BASE_REQUIRE_PATH');
const localToken = envStr('RESHUFFLE_DEV_SERVER_LOCAL_TOKEN');

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

const httpProxy = new proxy();
httpProxy.on('error', (err: any) => {
  console.error(err.stack);
});

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
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require(name);
          return [name, mod] as [string, any];
        } catch (err) {
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

const app = express();

const genDir = mkdtempSync(resolvePath(tmpDir, 'local_proxy_'));

async function transpileAndCopy() {
  if (!existsSync(basePath)) {
    return;
  }
  await babelDir({
    cliOptions: {
      filenames: [basePath],
      outDir: genDir,
    },
    babelOptions: {
      sourceMaps: true,
      configFile: __dirname + '/babelBackendConfig.js',
      babelrc: false,
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

const invokeHandler = getInvokeHandler(genDir);

app.post('/invoke', express.json(), async (req, res) => {
  if (req.get('x-reshuffle-dev-server-local-token') !== localToken) {
    res.status(403).end('bad or missing local token');
    return;
  }
  const startHrtime = process.hrtime();
  const requestId = nanoid();
  registry.register(requestId);
  // TODO: readd support for whitelisted functions
  try {
    await invokeHandler(req, res);
  } finally {
    // Not logging args to avoid sensitive info log (?)
    const { path, handler } = req.body;
    reportInvocationDurationUs(startHrtime, requestId, { path, handler });
    registry.unregister(requestId);
  }
});

const dbPath = resolvePath(tmpDir, 'db');
const initDataPath = resolvePath(rootPath, 'template_init_data.json');
let initData: any;
if (!existsSync(dbPath) && existsSync(initDataPath)) {
  try {
    initData = JSON.parse(readFileSync(initDataPath, 'utf8'));
    if (!Array.isArray(initData.items)) {
      throw new Error('initData.items');
    }
  } catch (err) {
    // Logging during startup will usually get cleared by create-react-app
    // screen clear, but the log will still be saved in the log directory
    console.error('Error processing template_init_data.json', err);
  }
}
const db = new DBHandler(dbPath, initData, (err) => {
  if (err) {
    if (err.name === 'OpenError') {
      console.error(
        'Failed opening db. ' +
        'Please note: only one instance of the local reshuffle environment can be launched concurrently.'
      );
    }
    console.error(err);
    process.exit(1);
  }
});
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

app.options('*', (_, res) => {
  // Don't allow CORS
  res.sendStatus(200);
});

app.use((req, res) => {
  httpProxy.web(req, res, {
    target: `http://localhost:${req.get('x-reshuffle-webapp-port')}/`,
  });
});

setHTTPHandler(app);

const initPromise = (async (): Promise<HTTPHandler> => {
  await transpilePromise;

  if (!process.env.RESHUFFLE_DB_BASE_URL) {
    // This can never happen, because POST can only occur after we
    // start listening and set RESHUFFLE_DB_BASE_URL.  Verify it just
    // in case.
    console.error('[I] Invoked before local RESHUFFLE_DB_BASE_URL was set; local DB might break');
  }

  try {
    const userHandler = getHTTPHandler(genDir);
    if (userHandler === undefined) {
      return app;
    }
    // Replace the path to avoid confusion
    console.log('Using handler from', userHandler.path.replace(genDir, basePath));
    return userHandler.fn;
  } catch (err) {
    console.error('Failed to require _handler', err);
    return app;
  }
})();

async function httpCallback(req: http.IncomingMessage, res: http.ServerResponse) {
  const fn = await initPromise;
  fn(req, res);
}

const dbApp = new Koa();
const dbBaseRouter = new KoaRouter();
const dbRouter = new DBRouter(db);
dbBaseRouter.use('/v1', dbRouter.koaRouter.routes(), dbRouter.koaRouter.allowedMethods());
dbApp.use(dbBaseRouter.routes());
dbApp.use(dbBaseRouter.allowedMethods());

const dbServer = dbApp.listen(0, '127.0.0.1');
dbServer.once('listening', async () => {
  const { port: dbPort } = dbServer.address() as AddressInfo;
  registry.logger.info('DB listening for HTTP requests', { port: dbPort });

  const server = http.createServer(httpCallback);
  server.listen(0, '127.0.0.1', async () => {
    const { port } = server.address() as AddressInfo;
    registry.logger.info('Listening for HTTP requests', { port });
    await setupEnv({ port: dbPort });
    // Environment variables are set, can load whitelisted modules.
    whitelisted.loadModules();
    if (process.send) process.send({ type: 'ready', port });
  });
});
