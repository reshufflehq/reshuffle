/**
 * # Reshuffle key-value store
 *
 * The store is available from any backend function.  Frontend
 * functions are untrusted and can only access the store by calling a
 * backend function.  Keys are unique `string`s.  Values are JSON
 * objects ("documents").  The key-value store associates values with
 * keys.
 *
 * ## Guidelines for return codes and exceptions
 *
 * All methods throw on errors.  An error can be due to infrastructure
 * (e.g. a communications error or backend unavailability) or Not
 * having an expected value is _not_ an error and is indicated by a
 * return code.
 */

import deepFreeze, { DeepReadonly } from 'deep-freeze';
import { DBClient, Options } from '@reshuffle/interfaces-node-client';
import {
  ClientContext,
  Document,
  Patch,
  PollOptions,
  Serializable,
  UpdateOptions,
  Version,
  VersionedMaybeObject,
} from '@reshuffle/interfaces-node-client/interfaces';

import * as Q from './query';

/**
 * A JSON-serializable document object.  It can contain only
 * primitives (`null`, `string`, `number`, or `boolean`), or arrays of
 * serializable objects, or object with serializable values.
 *
 * In particular, `Date`s, functions, or objects with circular
 * references can never appear in a serializable object.
 */
// Use this strange type copy to get Typedoc to allow us to document.
export type Serializable = Serializable;

/**
 * Object containing interface for constructing queries.  These
 * methods are designed to help prevent query injection from untrusted
 * clients.  All queries should be constructed using these methods.
 */
export { Q };

/**
 * A given version of a value in the store.
 */
export interface Versioned<T extends Serializable | undefined> {
  /** Opaque identifier of the version */
  version: Version;
  /** The value at version */
  value: T;
}

// bigint not currently allowed.
const allowedTypes = new Set(['object', 'boolean', 'number', 'string']);

function checkValue(value: Serializable) {
  if (!allowedTypes.has(typeof value)) {
    throw new TypeError(`Non-JSONable value of type ${typeof value} at top level`);
  }
}

// Generates successive promises to sleep in order to back off.  (Not
// an async iterator, so you can generate the promise to back off,
// then try something, and then back off for the remainder of the
// generated time.)
function* backoff() {
  let delayMs = 20;
  for (;;) {
    yield new Promise((res) => setTimeout(res, delayMs));
    delayMs *= 1.2;
  }
}

/**
 * An instance of a store client.  Currently a single instance is
 * provided as the global variable [[db]].
 */
export class DB {
  private readonly client: DBClient;

  constructor(url: string, private readonly ctx: ClientContext, options?: Options) {
    this.client = new DBClient(url, options);
  }

  /**
   * Gets a single document.
   *
   * @param key of value to fetch
   * @return a promise containing the fetched value or undefined if none found
   */
  public async get<T extends Serializable = any>(key: string): Promise<T | undefined> {
    return (await this.client.get(this.ctx, key)) as T;
  }

  /**
   * Atomically creates a document if it does not already exist.
   *
   * @param key of value to store
   * @param value to store
   * @return a promise that is true if key previously had no value and value was stored at key
   */
  public async create(key: string, value: Serializable): Promise<boolean> {
    checkValue(value);
    return this.client.create(this.ctx, key, value);
  }

  /**
   * Removes a single document.
   * @param key to remove
   * @return a promise that is true if key was in use (and is now removed)
   */
  public async remove(key: string): Promise<boolean> {
    return this.client.remove(this.ctx, key);
  }

  // TODO(ariels): Support operationId for streaming.
  /**
   * Atomically updates the value at key by calling the specified
   * updater function.
   *
   * ## Example: increment a counter
   *
   * ```js
   * await db.update('counter', (n) => n + 1);
   * ```
   *
   * ## Example: capitalize names
   *
   * ```js
   * await db.update('user', function (user) {
   *     return {
   *       ...user,
   *       firstName: user.firstName.toUpperCase(),
   *       lastName: user.lastName.toUpperCase(),
   *     };
   * });
   * ```
   *
   * @param key Key of the value to update
   *
   * @param updater Function to update stored value.  The updater
   *   function is called with the previous value `state`, which may be
   *   `undefined` if no value is stored at `key`.  It may copy but must
   *   *not* modify its parameter `state`.  When multiple concurrent
   *   updates occur the function may be called multiple times.
   *
   * @return A promise of the new value that was stored.
   */
  public async update<T extends Serializable = any>(
    key: string, updater: (state?: DeepReadonly<T>) => T, options?: UpdateOptions,
  ): Promise<DeepReadonly<T>> {
    for (const delay of backoff()) {
      const { value, version } = await this.getWithVersion(key);
      // deepFreeze doesn't like some values (like undefined), trick
      // it by referring to value in an object.
      const newValue = updater(deepFreeze({ value: value as T }).value);
      checkValue(newValue);
      if (await this.setIfVersion(key, version, newValue, options)) return deepFreeze(newValue);
      await delay;
    }
    throw Error('Timed out');   // backoff() is currently infinite but
                                // won't stay that way.  Needed for
                                // TypeScript.
  }

  private getWithVersion(key: string): Promise<VersionedMaybeObject> {
    return this.client.getWithVersion(this.ctx, key);
  }

  /**
   * Polls on updates to specified keys since specified versions.
   * @see KeyedVersions
   * @see KeyedPatches
   */
  public async poll(
    keysToVersions: Array<[string, Version]>,
    opts: PollOptions = {},
  ): Promise<Array<[string, Patch[]]>> {
    return this.client.poll(this.ctx, keysToVersions, opts);
  }

  /**
   * Gets a initial document in an intent to for poll on it.
   */
  public async startPolling<T extends Serializable = any>(key: string): Promise<Versioned<T | undefined>> {
    return this.client.startPolling(this.ctx, key) as Promise<Versioned<T | undefined>>;
  }

  /**
   * Find documents matching query.
   * @param query - a query constructed with Q methods.
   * @return - an array of documents
   */
  public async find(query: Q.Query): Promise<Document[]> {
    return this.client.find(this.ctx, query.getParts());
  }

  private async setIfVersion(
    key: string,
    version: Version,
    value?: Serializable,
    options?: UpdateOptions,
  ): Promise<boolean> {
    return this.client.setIfVersion(this.ctx, key, version, value, options);
  }
}
