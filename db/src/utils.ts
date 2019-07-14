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
