import { path, comparator } from 'ramda';
import LevelUpCtor, { LevelUp } from 'levelup';
import LevelDown from 'leveldown';
import { Mutex } from 'async-mutex';
import { ValueError } from './errors';
import * as Q from './query';

export { Q };

export type Primitive = string | number | boolean | Date | null;
export interface SerializableArray extends Array<SerializableArray | SerializableObject | Primitive | undefined> {}
export interface SerializableObject { [key: string]: SerializableArray | SerializableObject | Primitive | undefined; }
export type Serializable = Primitive | SerializableArray | SerializableObject;
export interface Document {
  key: string;
  value: Serializable;
}

function checkValue(value: Serializable) {
  if (typeof value === 'undefined') {
    throw new ValueError('Value must be not be undefined');
  }
}

export class DB {
  protected readonly writeLock = new Mutex();
  protected readonly db: LevelUp;
  constructor(protected readonly dbPath: string) {
    this.db = new LevelUpCtor(new LevelDown(dbPath));
  }

  /**
   * Gets a single document.
   * @return - value or undefined if key doesn’t exist.
   */
  public async get(key: string): Promise<Serializable | undefined> {
    try {
      const val = await this.db.get(key);
      return JSON.parse(val.toString());
    } catch (err) {
      if (err.name === 'NotFoundError') {
        return undefined;
      }
      throw err;
    }
  }

  /**
   * Creates a document for given key.
   * @param value - Cannot be undefined, must be an object
   * @return - true if document was created, false if key already exists.
   */
  public async create(key: string, value: Serializable): Promise<boolean> {
    checkValue(value);
    const serialized = JSON.stringify(value);
    return await this.writeLock.runExclusive(async () => {
      const prev =  await this.get(key);
      if (prev !== undefined) {
        return false;
      }
      await this.db.put(key, serialized);
      return true;
    });
  }

  /**
   * Removes a single document.
   * @return - true if document was deleted, false if key doesn’t exist.
   */
  public async remove(key: string): Promise<boolean> {
    return await this.writeLock.runExclusive(async () => {
      const prev = await this.get(key);
      if (prev === undefined) {
        return false;
      }
      await this.db.del(key);
      return true;
    });
  }

  /**
   * Updates a single document.
   * @param updater - Function that gets the previous value and returns the next value
   *                  to update the DB with, updater cannot return undefined.
   * @param initializer - `updater` will get this value if no document exists for `key`.
   * @return - The new value returned from updater
   */
  public async update<T extends Serializable, R extends Serializable>(
    key: string, updater: (state?: T) => R, initializer?: T
  ): Promise<R> {
    return await this.writeLock.runExclusive(async () => {
      const prev = await this.get(key) || initializer;
      const next = updater(prev as T);
      checkValue(next);
      await this.db.put(key, JSON.stringify(next));
      return next;
    });
  }

  /**
   * Find documents matching query.
   * @param query - a query constructed with Q methods.
   * @return - an array of documents
   */
  public async find(query: Q.Query): Promise<Document[]> {
    const { filter, limit, skip, orderBy } = query.toJSON();
    const results: Document[] = [];
    await new Promise((resolve, reject) => {
      const it = this.db.iterator({
        keyAsBuffer: false,
        valueAsBuffer: false,
      });
      const next = (err: any, key: string, rawValue: string) => {
        if (err) {
          return reject(err);
        }
        if (!key) {
          // Iteration complete
          return it.end(resolve);
        }
        const value = JSON.parse(rawValue);
        if (match({ key, value }, filter)) {
          results.push({ key, value });
        }
        return it.next(next);
      };
      it.next(next);
    });
    return results
    .sort(comparator(buildComparator(orderBy)))
    .slice(skip, limit === undefined ? undefined : (skip || 0) + limit);
  }
}

export function buildComparator(orderBy: Q.Order[] = []) {
  return (a: any, b: any) => orderBy.every(([p, direction]) => {
    const vA = path(p, a) as any;
    const vB = path(p, b) as any;
    return direction === Q.ASC ? vA <= vB : vA >= vB;
  });
}

export function match(doc: Document, filter: Q.Filter): boolean {
  switch (filter.operator) {
    case 'and':
      return filter.filters.every((f) => match(doc, f));
    case 'or':
      return filter.filters.some((f) => match(doc, f));
    case 'not':
      return !match(doc, filter.filter);
  }

  const value = path(filter.path, doc);

  switch (filter.operator) {
    case 'eq':
      return value === filter.value;
    case 'ne':
      return value !== filter.value;
    case 'gt':
      return typeof value === typeof filter.value && value as any > filter.value;
    case 'gte':
      return typeof value === typeof filter.value && value as any >= filter.value;
    case 'lt':
      return typeof value === typeof filter.value && value as any < filter.value;
    case 'lte':
      return typeof value === typeof filter.value && value as any <= filter.value;
    case 'exists':
      return value !== undefined;
    case 'matches':
      if (typeof value !== 'string') {
        return false;
      }
      const regexp = new RegExp(filter.pattern, filter.caseInsensitive ? 'i' : undefined);
      return regexp.test(value);
    case 'startsWith':
      if (typeof value !== 'string') {
        return false;
      }
      return value.startsWith(filter.value);
  }
}
