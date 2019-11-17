import express from 'express';
import get from 'lodash.get';
import { getHandler, Handler, HandlerError } from './handler';

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
type ExpressHandler = (req: express.Request, res: express.Response) => any;

export let currentSession = undefined;

export function getInvokeHandler(backendDir: string): ExpressHandler {
  return async (req: express.Request, res: express.Response) => {
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
      // Support "passport" session only
      module.exports.currentSession = get(req, ['session', 'passport', 'user']);
      const promise = fn(...args);
      module.exports.currentSession = undefined;
      const response = await promise;
      if (response === undefined) {
        return res.sendStatus(204);
      }
      return res.status(200).json(response);
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error('Failed to invoke handler', error);
      return res.status(500).json({ error: 'Failed to invoke' });
    }
  };
}
