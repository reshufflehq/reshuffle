import process from 'process';
import { DeepReadonly } from 'deep-freeze';
import {
  Document,
  UpdateOptions,
  Serializable,
} from '@binaris/shift-interfaces-node-client/interfaces';
import { DB, Versioned, Q } from './db';

export { Q };

// TODO(bergundy): Verify environment variables
const db = new DB(
  `${process.env.SHIFT_DB_BASE_URL!}/v1`,
  {
    appId: process.env.SHIFT_APPLICATION_ID!,
    auth: {
      v1: {
        token: '<unused>',
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
export async function find(query: Q.Query): Promise<Document[]> {
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
