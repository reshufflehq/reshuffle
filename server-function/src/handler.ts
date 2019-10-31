import path from 'path';

export class HandlerError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export class UnauthorizedError extends HandlerError {
  public readonly name = 'UnauthorizedError';

  constructor(message: string) {
    super(message, 403);
  }
}

export type Handler = (...args: any) => any;

export function getHandler(backendDir: string, fnPath: string, handler: string, checkExposed: boolean = true): Handler {
  const joinedDir = path.resolve(backendDir, fnPath);
  if (path.relative(backendDir, joinedDir).startsWith('..')) {
    throw new UnauthorizedError(`Cannot reference path outside of root dir: ${fnPath}`);
  }
  const mod = require(joinedDir);
  const fn = mod[handler];
  // Cast to any so typescript doesn't complain against accessing __reshuffle__ on a function
  if (typeof fn !== 'function') {
    throw new HandlerError(`${fnPath}.${handler} is not a function`, 400);
  }
  const { __reshuffle__ } = fn;
  if (checkExposed && !(__reshuffle__ && __reshuffle__.exposed)) {
    throw new  UnauthorizedError(`Cannot invoke ${fnPath}.${handler} - not an exposed function`);
  }
  return fn;
}

function resolveHandlerPath(backendDir: string, handler: string) {
  try {
    return require.resolve(path.resolve(backendDir, handler));
  } catch (err) {
    return undefined;
  }
}

export function getHTTPHandler(backendDir: string) {
  const handlerPath = resolveHandlerPath(backendDir, '_handler');
  if (handlerPath === undefined) {
    return undefined;
  }
  return {
    fn: getHandler(backendDir, '_handler', 'default', false),
    path: handlerPath,
  };
}
