import fs from 'mz/fs';
import { Server } from './index';
import { resolve as pathResolve } from 'path';
import { BinarisFunction } from './binaris';

const allowedHosts = (process.env.SHIFT_APPLICATION_DOMAINS || '').split(',');
const shiftServer = new Server('./build', undefined, undefined, allowedHosts);

interface InvokeRequest {
  path: string;
  handler: string;
  args: any[];
}

function isInvokeRequest(body: unknown): body is InvokeRequest {
  if (body === undefined) {
    return false;
  }
  const maybeInvoke = body as InvokeRequest;
  return typeof maybeInvoke.path === 'string' &&
    typeof maybeInvoke.handler === 'string' &&
    Array.isArray(maybeInvoke.args);
}

export const handler: BinarisFunction = async (body, ctx) => {
  const url = ctx.request.path;
  const decision = await shiftServer.handle(url, ctx.request.headers);
  switch (decision.action) {
    case 'handleInvoke': {
      if (!isInvokeRequest(body)) {
        return new ctx.HTTPResponse({
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invoke request is not of the form { path, handler, body }',
          }),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // TODO: Host header not checked due to not being passed on Binaris platform
      if (!shiftServer.checkHeadersAllowedHost(ctx.request.headers, 'origin')) {
        return new ctx.HTTPResponse({
          statusCode: 403,
          body: JSON.stringify({
            error: 'Invalid Origin',
          }),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const { path, handler: fnHandler, args } = body;
      const joinedDir = pathResolve('./backend', path);
      const mod = require(joinedDir);
      const fn = mod[fnHandler];
      return fn(...args);
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
