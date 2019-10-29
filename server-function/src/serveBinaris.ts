import { getHandler, Handler, HandlerError } from './index';
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

function isValidInvokeRequest(req: express.Request) {
  if (req.body === undefined) {
    return false;
  }
  if (req.method !== 'POST') {
    return false;
  }
  const contentType = req.get('content-type');
  if (!contentType || !contentType.startsWith('application/json')) {
    return false;
  }
  const maybeInvoke = req.body as InvokeRequest;
  return typeof maybeInvoke.path === 'string' &&
    typeof maybeInvoke.handler === 'string' &&
    Array.isArray(maybeInvoke.args);
}

const app = express();
app.post('/invoke', express.json(), async (req, res) => {
  // TODO: check for allowed origins when supporting CORS
  // Currently expected to 400 on a Preflight Request and not reach invoke
  if (!isValidInvokeRequest(req)) {
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
      return res.status(204).end();
    }
    return res.status(200).json(response);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke handler', { error });
    return res.status(500).json({ error: 'Failed to invoke' });
  }
});

app.use(express.static(buildDir));

export type HTTPHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;
export const handler: HTTPHandler = app;
Object.assign(handler, { __reshuffle__: { handlerType: 'http' } });
