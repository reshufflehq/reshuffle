import { getHandler, Handler, HandlerError } from './handler';
import { resolve as pathResolve } from 'path';
import express from 'express';
import http from 'http';

const backendDir = pathResolve('./backend');
const buildDir = pathResolve('./build');

interface InvokeRequest {
  path: string;
  handler: string;
  args: any[];
}

function isValidInvokeRequest(body: any, contentType?: string): body is InvokeRequest {
  if (body === undefined) {
    return false;
  }
  if (!contentType || !contentType.startsWith('application/json')) {
    return false;
  }
  const maybeInvoke = body as InvokeRequest;
  return typeof maybeInvoke.path === 'string' &&
    typeof maybeInvoke.handler === 'string' &&
    Array.isArray(maybeInvoke.args);
}

const app = express();
app.post('/invoke', express.json(), async (req, res) => {
  // TODO: check for allowed origins when supporting CORS
  // Currently expected to 400 on a Preflight Request and not reach invoke
  if (!isValidInvokeRequest(req.body, req.get('content-type'))) {
    return res.status(400).json({
      error: 'Invoke request is not a JSON POST of the form { path, handler, body }',
    });
  }
  const { path, handler: fnHandler, args } = req.body;
  let fn: Handler;
  try {
    try {
      fn = getHandler(backendDir, path, fnHandler);
    } catch (error) {
      if (error instanceof HandlerError) {
        return res.status(error.status).json({ error: error.message });
      }
      throw error;
    }
    const response = await fn(...args);
    if (response === undefined) {
      return res.sendStatus(204);
    }
    return res.status(200).json(response);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke handler', { error });
    return res.status(500).json({ error: 'Failed to invoke' });
  }
});

app.use(express.static(buildDir));
app.get('*', (_req, res) => res.sendFile(pathResolve(buildDir, 'index.html')));

export type HTTPHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export const defaultHandler: HTTPHandler = app;

export const handler: HTTPHandler = (req, res) => {
  let fn: HTTPHandler;
  try {
    const joinedDir = pathResolve(backendDir, '_handler');
    const mod = require(joinedDir);
    fn = mod.default || app;
  } catch (err) {
    fn = app;
  }
  fn(req, res);
};

Object.assign(handler, { __reshuffle__: { handlerType: 'http' } });
