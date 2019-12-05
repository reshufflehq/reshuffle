// tslint:disable:no-console
import { resolve as pathResolve } from 'path';
import express from 'express';
import http from 'http';
import once from 'lodash.once';
import { getHTTPHandler } from './handler';
import { getInvokeHandler } from './invoke';
import sourceMapSupport from 'source-map-support';
// not handling uncaughtException - both local-proxy and runtime expected to handle them
sourceMapSupport.install({ handleUncaughtExceptions: false, environment: 'node' });

const backendDir = pathResolve('./backend');
const buildDir = pathResolve('./build');

const app = express();
app.post('/invoke', express.json(), getInvokeHandler(backendDir));
app.use(express.static(buildDir));
app.get('*', (_req, res) => res.sendFile(pathResolve(buildDir, 'index.html')));

export type HTTPHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export const defaultHandler: HTTPHandler = app;

const getHTTPHandlerOnceAndLog = once((): HTTPHandler => {
  try {
    const userHandler = getHTTPHandler(backendDir);
    if (userHandler === undefined) {
      return app;
    }
    /* tslint:disable-next-line:no-console*/ /* eslint-disable-next-line no-console */
    console.log('Using handler from', userHandler.path);
    return userHandler.fn;
  } catch (err) {
    /* tslint:disable-next-line:no-console*/ /* eslint-disable-next-line no-console */
    console.error('Failed to require _handler', err);
    return app;
  }
});

export const handler: HTTPHandler = (req, res) => {
  const fn = getHTTPHandlerOnceAndLog();
  fn(req, res);
};

Object.assign(handler, { __reshuffle__: { handlerType: 'http' } });
