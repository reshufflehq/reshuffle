export class TimeoutError extends Error {
  public readonly name = 'TimeoutError';
}

// Tests not included since this code is borrowed from a utility library
export const withTimeout = async <T>(promise: Promise<T>, timeout: number = 5000): Promise<T> => {
  let handle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    handle = setTimeout(() => reject(new TimeoutError('Timeout')), timeout);
  });

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]) as Promise<T>;
  } finally {
    clearTimeout(handle!);
  }
};

export const noop = () => undefined;

export function deferred<T>() {
  // resolve and reject have to be initialized to prevent typescript from complaining that they're uninitialized
  let resolve: (value?: T | PromiseLike<T> | undefined) => void = noop;
  let reject: (reason?: any) => void = noop;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve,
    reject,
  };
}

const NS_PER_SEC = 1e9;

export function hrnano() {
  const [a, b] = process.hrtime();
  return a * NS_PER_SEC + b;
}
