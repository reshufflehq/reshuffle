// tslint:disable:no-console
import path from 'path';
import nodemon from 'nodemon';
import proxy from 'http-proxy';
import { Application } from 'express';
import nanoid from 'nanoid';
import { EventEmitter } from 'events';
import { Server } from '@binaris/shift-server-function';

const isTestEnv = process.env.NODE_ENV === 'test';

function log(message?: any, ...optionalParams: any[]) {
  if (!isTestEnv) {
    console.log(message, ...optionalParams);
  }
}

function logError(message?: any, ...optionalParams: any[]) {
  if (!isTestEnv) {
    console.error(message, ...optionalParams);
  }
}

function makePortPromise(portEmitter: EventEmitter): Promise<number> {
  return new Promise((resolve) => portEmitter.once('port', (port: number) => resolve(port)));
}

interface PortPromiseHolder {
  portPromise: Promise<number>;
}

export function startProxy(
  rootDir: string,
  localToken: string,
): PortPromiseHolder {
  log('Dev server starting');
  const portEmitter = new EventEmitter();
  const promiseHolder = { portPromise: makePortPromise(portEmitter) };

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
    // AVA (#1849) translates console.log to stderr
    // Rush detects stderr as warnings and returns an exit code
    stdout: !isTestEnv,
  });

  nodemon.on('quit', () => {
    process.exit();
  }).on('start', (_child: any) => {
    logError('Local dev server started');
  }).on('message', (message: any) => {
    if (message.type === 'ready') {
      portEmitter.emit('port', message.port);
    }
  }).on('crash', () => {
    logError('Local dev server crashed');
    process.exit(1);
  }).on('restart', (files: string[]) => {
    promiseHolder.portPromise = makePortPromise(portEmitter);
    log('Local dev server restarted due to changes in: ', files);
  });
  return promiseHolder;
}

export function setupProxy(sourceDir: string) {
  const rootDir = path.resolve(sourceDir, '..');
  const shiftServer = new Server(path.join(rootDir, 'public'));
  const localToken = nanoid();
  const httpProxy = new proxy();
  httpProxy.on('error', (err: any) => console.error(err.stack));
  return (app: Application) => {
    const promiseHolder = startProxy(rootDir, localToken);
    app.use(async (req, res, next) => {
      const decision = await shiftServer.handle(req.url);
      switch (decision.action) {
        case 'handleInvoke': {
          const port = await promiseHolder.portPromise;
          return httpProxy.web(req, res, {
            target: `http://localhost:${port}/`,
            headers: { 'x-shift-dev-server-local-token': localToken },
          });
        }
        case 'sendStatus': {
          // in dev environment static files do not exist on disk but are served by webpack-dev-server
          if (/^\/static\//.test(req.url)) {
            break;
          }
          return res.sendStatus(decision.status);
        }
        case 'serveFile': {
          // TODO: handle logic when path doesn't match exactly
          break;
        }
      }
      return next();
    });
  };
}
