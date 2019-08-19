import { DBClient, Options } from '@binaris/shift-interfaces-node-client';
import {
  ClientContext, UpdateOptions, Version, VersionedMaybeObject, Serializable
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
        appId: process.env.APP_ID!,
        apiKey: process.env.API_KEY!,
      },
    },
  };

  constructor(options?: Options) {
    this.client = new DBClient(`${process.env.DB_BASE_URL!}/v1`, merge(defaultOptions, options));
  }

  public async get<T extends Serializable = any>(key: string): Promise<T | undefined> {
    return (await this.client.get(this.ctx, key)) as T;
  }

  public async create(key: string, value: Serializable): Promise<boolean> {
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
      const newValue = updater(deepFreeze(value as T));
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

  public async find(): Promise<any[]> {
    throw new Error('Unimplemented');
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
get.__shiftjs__ = { exposed: true };

/**
 * Creates a document for given key.
 * @param value - Cannot be undefined, must be an object
 * @return - true if document was created, false if key already exists.
 */
export async function create(key: string, value: Serializable): Promise<boolean> {
  return await db.create(key, value);
}
create.__shiftjs__ = { exposed: true };

/**
 * Removes a single document.
 * @return - true if document was deleted, false if key doesn’t exist.
 */
export async function remove(key: string): Promise<boolean> {
  return await db.remove(key);
}
remove.__shiftjs__ = { exposed: true };

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
export async function find(): Promise<any[]> {
  throw new Error('Unimplemented');
}
find.__shiftjs__ = { exposed: true };

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
