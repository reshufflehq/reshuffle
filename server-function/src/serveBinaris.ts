import fs from 'mz/fs';
import { Server, getHandler, Handler, HandlerError } from './index';
import { resolve as pathResolve } from 'path';
import { BinarisFunction, FunctionContext } from './binaris';

const allowedHosts = (process.env.RESHUFFLE_APPLICATION_DOMAINS || '').split(',');
const backendDir = pathResolve('./backend');
const buildDir = pathResolve('./build');
const server = new Server({ directory: './build', allowedHosts });

interface InvokeRequest {
  path: string;
  handler: string;
  args: any[];
}

function isInvokeRequest(body: unknown, ctx: FunctionContext): body is InvokeRequest {
  if (body === undefined) {
    return false;
  }
  if (ctx.request.method !== 'POST') {
    return false;
  }
  // TODO: ensure we can never receive body without content type
  if (!(ctx.request.headers['content-type'] as string || '').startsWith('application/json')) {
    return false;
  }
  const maybeInvoke = body as InvokeRequest;
  return typeof maybeInvoke.path === 'string' &&
    typeof maybeInvoke.handler === 'string' &&
    Array.isArray(maybeInvoke.args);
}

export const handler: BinarisFunction = async (body, ctx) => {
  const url = ctx.request.path;
  const decision = await server.handle(url, ctx.request.headers);
  switch (decision.action) {
    case 'handleInvoke': {
      // TODO: check for allowed origins when supporting CORS
      // Currently expected to 400 on a Preflight Request and not reach invoke
      if (!isInvokeRequest(body, ctx)) {
        return new ctx.HTTPResponse({
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invoke request is not a JSON POST of the form { path, handler, body }',
          }),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const { path, handler: fnHandler, args } = body;
      let fn: Handler;
      try {
        fn = getHandler(backendDir, path, fnHandler);
      } catch (error) {
        if (error instanceof HandlerError) {
          return new ctx.HTTPResponse({
            statusCode: error.status,
            body: JSON.stringify({ error: error.message }),
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw error;
      }
      const response = await fn(...args);
      if (response === undefined) {
        return new ctx.HTTPResponse({ statusCode: 204 });
      }
      return response;
    }
    case 'sendStatus': {
      return new ctx.HTTPResponse({
        statusCode: decision.status,
      });
    }
    case 'serveFile': {
      const headers: Record<string, string> = {};
      if (decision.contentType) {
        headers['Content-Type'] = decision.contentType;
      }
      if (decision.cacheHint) {
        Object.assign(headers, decision.cacheHint);
      }
      return new ctx.HTTPResponse({
        statusCode: decision.status || 200,
        headers,
        body: await fs.readFile(decision.fullPath),
      });
    }
    default: throw new Error('should not get here');
  }
};
