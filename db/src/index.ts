import { DB, Serializable } from './db';
export { Serializable };
export { ValueError } from './errors';

const dbPath = process.env.SHIFT_DB_PATH;
if (!dbPath) {
  throw new Error('SHIFT_DB_PATH env var not defined');
}

const db = new DB(dbPath);

/**
 * Gets a single document.
 * @return - value or undefined if key doesn’t exist.
 */
export async function get(key: string): Promise<Serializable | undefined> {
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
 * @param updater - Function that gets the previous value and returns the next value
 *                  to update the DB with, updater cannot return undefined.
 * @param initializer - `updater` will get this value if no document exists for `key`.
 * @return - The new value returned from updater
 */
export async function update<T extends Serializable, R extends Serializable>(
  key: string, updater: (state?: T) => R, initializer?: T
): Promise<R> {
  return await db.update(key, updater, initializer);
}
