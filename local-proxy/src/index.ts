// tslint:disable:no-console
import path from 'path';
import nodemon from 'nodemon';
import proxy from 'http-proxy-middleware';
import { Application } from 'express';
import nanoid from 'nanoid';

const isTestEnv = process.env.NODE_ENV === 'test';

function log(message?: any, ...optionalParams: any[]) {
  if (!isTestEnv) {
    console.log(message, ...optionalParams);
  }
}

// TODO(vladimir): allow overriding dev server port
const port = 19291;
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
    // this child is started
  }).on('message', (message) => {
    if (message === 'ready') {
      // this child is ready
    }
  }).on('restart', (files) => {
    log('Local dev server restarted due to changes in: ', files);
  });
}

export function setupProxy(sourceDir: string) {
  const rootDir = path.resolve(sourceDir, '..');
  const localToken = nanoid();
  return (app: Application) => {
    startProxy(rootDir, localToken);
    app.use(proxy('/invoke', {
      target: `http://localhost:${port}/`,
      headers: { 'x-shift-dev-server-local-token': localToken },
      logLevel: 'error',
    }));
  };
}
