import { DB } from './db';
export { KeyError, KeyAlreadyExistsError } from './db';

const dbPath = process.env.SHIFT_DB_PATH;
if (!dbPath) {
  throw new Error('SHIFT_DB_PATH env var not defined');
}

const db = new DB(dbPath);

/**
 * Gets a single document, throws KeyError in case key does not exist.
 */
export async function get(key: string): Promise<object> {
  return await db.get(key);
}

/**
 * Creates a document, throws `KeyAlreadyExistsError if key already exists.
 */
export async function create(key: string, value: object): Promise<void> {
  return await db.create(key, value);
}

/**
 * Updates a single document.
 *
 * @param updater - Function that gets the previous value and returns the next value.
 * @param initializer - `updater` will get this value if no document exists for `key`.
 */
export async function update<T extends object, R extends object>(
  key: string, updater: (state?: T) => R, initializer?: T
): Promise<void> {
  return await db.update(key, updater, initializer);
}

/**
 * Removes a single document or throws KeyError in case key does not exist.
 */
export async function remove(key: string): Promise<void> {
  return await db.remove(key);
}
