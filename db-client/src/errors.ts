/**
 * Thrown when a bad value is passed to an operator, e.g. a filter
 * contains an operator which is not supported on the backend.
 */
export class ValueError extends Error {
  public readonly name = 'ValueError';
}

/**
 * Thrown when an argument on the client side is semantically
 * incorrect, preventing a call to the server.
 */
export class IllegalArgumentError extends Error {
  public readonly name = 'IllegalArgumentError';
}
