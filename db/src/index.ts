import {
  DB,
  Q,
  Serializable,
  Document,
  DeepReadonly,
  UpdateOptions,
  KeyedPatches,
  KeyedVersions,
  Versioned,
} from './db';

export { Serializable, Q, Document, DeepReadonly, UpdateOptions, Versioned };
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

/**
 * Find documents matching query.
 * @param query - a query constructed with Q methods.
 * @return - an array of documents
 */
export async function find(query: Q.Query): Promise<Document[]> {
  return await db.find(query);
}

/**
 * Polls on updates to specified keys since specified versions.
 */
export async function poll(keysToVersions: KeyedVersions): Promise<KeyedPatches> {
  return await db.poll(keysToVersions);
}

/**
 * Gets a single document by key including its version.
 */
export async function getVersioned<T extends Serializable = any>(key: string): Promise<Versioned<T> | undefined> {
  const doc = await db.getWithMeta<T>(key);
  if (doc === undefined || doc.value === undefined) {
    return undefined;
  }
  return {
    version: doc.version,
    value: doc.value,
  };
}
