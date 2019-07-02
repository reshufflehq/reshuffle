// tslint:disable:no-console
import path from 'path';
import nodemon from 'nodemon';
import proxy from 'http-proxy';
import { Application } from 'express';
import nanoid from 'nanoid';
import { EventEmitter } from 'events';

const isTestEnv = process.env.NODE_ENV === 'test';

function log(message?: any, ...optionalParams: any[]) {
  if (!isTestEnv) {
    console.log(message, ...optionalParams);
  }
}

let port: number | undefined;
const readyEmitter = new EventEmitter().setMaxListeners(1000);
export function startProxy(rootDir: string, localToken: string) {
  if (process.env.NODE_ENV !== 'test') {
    log(`Dev server starting on port: ${port}`);
  }

  nodemon({
    watch: [
      path.join(rootDir, 'backend'),
    ],
    script: path.join(__dirname, 'server.js'),
    delay: 100,
    env: {
      SHIFT_DB_PATH: path.join(rootDir, '.shift.db'),
      SHIFT_DEV_SERVER_BASE_REQUIRE_PATH: path.resolve(path.join(rootDir, 'backend')),
      SHIFT_DEV_SERVER_LOCAL_TOKEN: localToken,
    },
    // Workaround for tests:
    // server.js uses babel/dir which has a console.log
    // AVA transaltes console.log to stderr
    // Rush detects stderr as warnings and returns an exit code
    stdout: process.env.NODE_ENV !== 'test',
  });

  nodemon.on('quit', () => {
    process.exit();
  }).on('start', (_child) => {
    if (process.env.NODE_ENV !== 'test') {
      log('Local dev server started');
    }
  }).on('message', (message) => {
    if (message.type === 'ready') {
      port = message.port;
      readyEmitter.emit('ready');
    }
  }).on('restart', (files) => {
    port = undefined;
    log('Local dev server restarted due to changes in: ', files);
  });
}

export function setupProxy(sourceDir: string) {
  const rootDir = path.resolve(sourceDir, '..');
  const localToken = nanoid();
  const httpProxy = new proxy();
  httpProxy.on('error', (err: any) => console.error(err.stack));
  return (app: Application) => {
    startProxy(rootDir, localToken);
    app.use(async (req, res, next) => {
      if (req.url !== '/invoke') {
        return next();
      }
      if (!port) {
        await new Promise((resolve) => readyEmitter.once('ready', resolve));
      }
      httpProxy.web(req, res, {
        target: `http://localhost:${port}/`,
        headers: { 'x-shift-dev-server-local-token': localToken },
      });
    });
  };
}
