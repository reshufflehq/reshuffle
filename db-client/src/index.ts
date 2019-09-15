import process from 'process';
import { DeepReadonly } from 'deep-freeze';
import {
  Document,
  Patch,
  Serializable,
  UpdateOptions,
  Version,
} from '@reshuffle/interfaces-node-client/interfaces';
import { DB, Versioned, Q } from './db';

export { Q };

function assertEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Environment variable ${name} not defined`);
  }
  return val;
}

const db = new DB(
  `${assertEnv('RESHUFFLE_DB_BASE_URL')}/v1`,
  {
    appId: assertEnv('RESHUFFLE_APPLICATION_ID'),
    appEnv: assertEnv('RESHUFFLE_APPLICATION_ENV'),
    collection: 'default',
    auth: {
      v1: {
        token: assertEnv('RESHUFFLE_ACCESS_TOKEN'),
      },
    },
  },
  {
    timeoutMs: 2000,
  },
);

/**
 * Gets a single document.
 * @return - value or undefined if key doesn’t exist.
 */
export async function get<T extends Serializable = any>(key: string): Promise<T | undefined> {
  return db.get(key);
}

/**
 * Creates a document for given key.
 * @param value - Cannot be undefined, must be an object
 * @return - true if document was created, false if key already exists.
 */
export async function create(key: string, value: Serializable): Promise<boolean> {
  return db.create(key, value);
}

/**
 * Removes a single document.
 * @return - true if document was deleted, false if key doesn’t exist.
 */
export async function remove(key: string): Promise<boolean> {
  return db.remove(key);
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
  return db.update(key, updater, options);
}
// Available only on backend, needs to pass a function.

/**
 * Find documents matching query.
 * @param query - a query constructed with Q methods.
 * @return - an array of documents
 */
export async function find(query: Q.Query): Promise<Document[]> {
  return db.find(query);
}

/**
 * Polls on updates to specified keys since specified versions.
 */
export async function poll(keysToVersions: Array<[string, Version]>): Promise<Array<[string, Patch[]]>> {
  return db.poll(keysToVersions);
}
poll.__reshuffle__ = { exposed: true };

/**
 * Gets a initial document in an intent to for poll on it.
 */
export async function startPolling<T extends Serializable = any>(key: string): Promise<Versioned<T | undefined>> {
  return db.startPolling(key);
}
startPolling.__reshuffle__ = { exposed: true };
