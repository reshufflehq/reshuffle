import { DBClient, Options } from '@binaris/shift-interfaces-node-client';
import {
  ClientContext,
  Document,
  UpdateOptions,
  Version,
  VersionedMaybeObject,
  Query,
  Serializable,
} from '@binaris/shift-interfaces-node-client/interfaces';
import deepFreeze, { DeepReadonly } from 'deep-freeze';
import { merge } from 'ramda';
import * as process from 'process';

export interface Versioned<T extends Serializable | undefined> {
  version: Version;
  value: T;
}

const defaultOptions: Options = {
  timeoutMs: 2000,
};

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

export class DBHandler {
  private readonly client: DBClient;
  private readonly ctx: ClientContext = {
    auth: {
      v1: {
        // TODO(ariels): Update with prefixes from binaris/spice#616.
        appId: process.env.SHIFT_APPLICATION_ID!,
        apiKey: '<unused>',
      },
    },
  };

  constructor(options?: Options) {
    this.client = new DBClient(`${process.env.SHIFT_DB_BASE_URL!}/v1`, merge(defaultOptions, options));
  }

  public async get<T extends Serializable = any>(key: string): Promise<T | undefined> {
    return (await this.client.get(this.ctx, key)) as T;
  }

  public async create(key: string, value: Serializable): Promise<boolean> {
    checkValue(value);
    return await this.client.create(this.ctx, key, value);
  }

  public async remove(key: string): Promise<boolean> {
    return await this.client.remove(this.ctx, key);
  }

  // TODO(ariels): Support operationId for streaming.
  public async update<T extends Serializable = any>(
    key: string, updater: (state?: DeepReadonly<T>) => T, _options?: UpdateOptions,
  ): Promise<DeepReadonly<T>> {
    for (const delay of backoff()) {
      const { value, version } = await this.getWithVersion(key);
      // deepFreeze doesn't like some values (like undefined), trick
      // it by referring to value in an object.
      const newValue = updater(deepFreeze({ value: value as T }).value);
      checkValue(newValue);
      if (await this.setIfVersion(key, newValue, version)) return deepFreeze(newValue);
      await delay;
    }
    throw Error('Timed out');   // backoff() is currently infinite but
                                // won't stay that way.  Needed for
                                // TypeScript.
  }

  private getWithVersion(key: string): Promise<VersionedMaybeObject> {
    return this.client.getWithVersion(this.ctx, key);
  }

  public async startPolling<T extends Serializable = any>(_key: string): Promise<Versioned<T | undefined>> {
    throw new Error('Unimplemented');
  }

  public async find(query: Query): Promise<Document[]> {
    return await this.client.find(this.ctx, query);
  }

  private async setIfVersion(
    key: string,
    value: Serializable,
    version: Version
  ): Promise<boolean> {
    return await this.client.setIfVersion(this.ctx, key, version, value);
  }
}

const db = new DBHandler();

/**
 * Gets a single document.
 * @return - value or undefined if key doesn’t exist.
 */
export async function get<T extends Serializable = any>(key: string): Promise<T | undefined> {
  return await db.get(key);
}

/**
 * Creates a document for given key.
 * @param value - Cannot be undefined, must be an object
 * @return - true if document was created, false if key already exists.
 */
export async function create(key: string, value: Serializable): Promise<boolean> {
  return await db.create(key, value);
}

/**
 * Removes a single document.
 * @return - true if document was deleted, false if key doesn’t exist.
 */
export async function remove(key: string): Promise<boolean> {
  return await db.remove(key);
}

/**
 * Updates a single document.
 * @param updater - Function that gets the previous value and returns the next value to update the DB with.
 *                  Cannot return undefined, receives undefined in case key doesn’t already exist in the DB.
 * @return - The new value returned from updater
 */
export async function update<T extends Serializable = any>(
  key: string, updater: (state?: DeepReadonly<T>) => T, options?: UpdateOptions,
): Promise<DeepReadonly<T>> {
  return await db.update(key, updater, options);
}
// Available only on backend, needs to pass a function.

/**
 * Find documents matching query.
 * @param query - a query constructed with Q methods.
 * @return - an array of documents
 */
export async function find(query: Query): Promise<Document[]> {
  return db.find(query);
}

/**
 * Polls on updates to specified keys since specified versions.
 */
export async function poll(): Promise<any> {
  throw new Error('Unimplemented');
}
poll.__shiftjs__ = { exposed: true };

/**
 * Gets a initial document in an intent to for poll on it.
 */
export async function startPolling<T extends Serializable = any>(_key: string): Promise<Versioned<T | undefined>> {
  throw new Error('Unimplemented');
}
startPolling.__shiftjs__ = { exposed: true };
