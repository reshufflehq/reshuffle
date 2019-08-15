import { EventEmitter } from 'events';
import { pair, path, sortWith, ascend, descend } from 'ramda';
import deepFreeze, { DeepReadonly } from 'deep-freeze';
import { compare } from 'fast-json-patch';
import LevelUpCtor, { LevelUp } from 'levelup';
import LevelDown from 'leveldown';
import { Mutex } from 'async-mutex';
import {
  UpdateOptions,
  Version,
  Patch,
} from '@binaris/shift-interfaces-node-client/interfaces';
import { ValueError } from './errors';
import * as Q from './query';
import { withTimeout, deferred, hrnano } from './utils';

export {
  Q,
  DeepReadonly,
  UpdateOptions,
};

export interface Versioned<T> {
  version: Version;
  value: T;
}

// BUG: Lost by typescript-json-schema in Concord, reintroduce it here.
export type KeyedPatches = Array<[string, Patch[]]>;

const NUM_PATCHES_TO_KEEP = 20;
const DEFAULT_READ_BLOCK_TIME_MS = 50000;

// Typescript's way of defining any - undefined
// see: https://github.com/Microsoft/TypeScript/issues/7648
export type Serializable = {} | null;

export function incrVersion({ major, minor }: Version, amount: number = 1): Version {
  return { major, minor: minor + amount };
}

export function decrVersion(version: Version, amount: number = 1): Version {
  return incrVersion(version, -amount);
}

export function isGreaterVersion(a: Version, b: Version): boolean {
  return a.major > b.major || a.major === b.major && a.minor > b.minor;
}

export type KeyedVersions = Array<[string, Version]>;

interface StoredDocument<T> extends Versioned<T> {
  /**
   * Stores changes made to the document, meant to be used internally by poll().
   */
  readonly patches: ReadonlyArray<Patch>;
  readonly updatedAt: number;
}

/**
 * The result of a remove operation on a document - meant to be periodically pruned.
 */
type Tombstone = StoredDocument<undefined>;

export interface PollOptions {
  readBlockTimeMs: number;
}

export interface Document {
  key: string;
  value: Serializable;
}

// bigint not currently allowed.
const allowedTypes = new Set(['object', 'boolean', 'number', 'string']);

function checkValue(value: Serializable) {
  if (!allowedTypes.has(typeof value)) {
    throw new TypeError(`Non-JSONable value of type ${typeof value} at top level`);
  }
}

export class DB extends EventEmitter {
  protected readonly writeLock = new Mutex();
  protected readonly db: LevelUp;
  constructor(protected readonly dbPath: string) {
    super();
    this.db = new LevelUpCtor(new LevelDown(dbPath));
  }

  protected async put(
    key: string, prev: StoredDocument<any> | undefined, value: any, options?: UpdateOptions
  ): Promise<void> {
    const prevValue = prev === undefined ? undefined : prev.value;
    const version = prev === undefined || prev.value === undefined ?
      { major: hrnano(), minor: 1 } : incrVersion(prev.version);
    const patches = prev ? prev.patches : [];
    const ops = compare({ root: prevValue }, { root: value });
    if (ops.length > 0) {
      const patch = { version, ops, ...options };
      await this.db.put(key, JSON.stringify({
        version,
        value,
        patches: patches.slice(-NUM_PATCHES_TO_KEEP).concat(patch),
        updatedAt: hrnano(),
      }));
      this.emit('patch', key, patch);
    }
  }

  /**
   * Gets a single document.
   * @return - value or undefined if key doesn’t exist.
   */
  public async get<T extends Serializable = any>(key: string): Promise<T | undefined> {
    const versioned = await this.getWithMeta(key);
    if (versioned === undefined) {
      return undefined;
    }
    return versioned.value;
  }

  /**
   * Gets a single document with its version.
   * @return - { version, value } or undefined if key doesn’t exist.
   */
  public async getWithMeta<T extends Serializable = any>(
    key: string
  ): Promise<StoredDocument<T> | Tombstone | undefined> {
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
    return await this.writeLock.runExclusive(async () => {
      const prev = await this.getWithMeta(key);
      if (prev !== undefined && prev.value !== undefined) {
        return false;
      }
      await this.put(key, prev, value);
      return true;
    });
  }

  /**
   * Removes a single document.
   * @return - true if document was deleted, false if key doesn’t exist.
   */
  public async remove(key: string): Promise<boolean> {
    return await this.writeLock.runExclusive(async () => {
      const prev = await this.getWithMeta(key);
      if (prev === undefined || prev.value === undefined) {
        return false;
      }
      // TODO: Schedule periodic DB vacuum and delete old tombstones
      await this.put(key, prev, undefined);
      return true;
    });
  }

  /**
   * Updates a single document.
   * @param updater - Function that gets the previous value and returns the next value to update the DB with.
   *                  Cannot return undefined, receives undefined in case key doesn’t already exist in the DB.
   * @return - The new value returned from updater
   */
  public async update<T extends Serializable = any>(
    key: string, updater: (state?: DeepReadonly<T>) => T, options?: UpdateOptions,
  ): Promise<DeepReadonly<T>> {
    return await this.writeLock.runExclusive(async () => {
      const prev = await this.getWithMeta<T>(key);
      const frozen = deepFreeze({ value: prev && prev.value });
      // We could have made updater return DeepReadonly<T> but that would make writing updaters very hard.
      // We decided to work around the type system to prevent the case that a user tries to modify the return
      // value and gets a TypeError.
      const nextValue = updater(frozen.value) as unknown as DeepReadonly<T>;
      checkValue(nextValue);
      await this.put(key, prev, nextValue, options);
      return nextValue;
    });
  }

  /**
   * Polls on updates to specified keys since specified versions.
   * @see KeyedVersions
   * @see KeyedPatches
   */
  public async poll(keysToVersions: KeyedVersions, opts: Partial<PollOptions> = {}): Promise<KeyedPatches> {
    const keysToVersionsMap = new Map(keysToVersions);
    const { promise, resolve } = deferred<KeyedPatches>();
    // Make sure we don't miss any live updates in case the initial scan (below) comes back empty.
    const patchHandler = (key: string, patch: Patch) => {
      const subscribedVersion = keysToVersionsMap.get(key);
      if (subscribedVersion !== undefined && isGreaterVersion(patch.version, subscribedVersion)) {
        resolve([[key, [patch]]]);
      }
    };
    this.on('patch', patchHandler);
    try {
      // Scan the DB for matching patches
      const keyedPatchesOrUndef = await Promise.all(keysToVersions.map(async ([key, version]) => {
        const doc = await this.getWithMeta(key);
        if (doc === undefined) {
          return undefined;
        }
        const patches = doc.patches.filter((patch) => isGreaterVersion(patch.version, version));
        if (patches.length === 0) {
          return undefined;
        }
        return pair(key, patches);
      }));
      const keyedPatches = keyedPatchesOrUndef.filter(
        (patch: [string, Patch[]] | undefined): patch is [string, Patch[]] => patch !== undefined);
      if (keyedPatches.length > 0) {
        return keyedPatches;
      }
      try {
        return await withTimeout(promise, opts.readBlockTimeMs || DEFAULT_READ_BLOCK_TIME_MS);
      } catch (err) {
        if (err.name === 'TimeoutError') {
          return [];
        }
        throw err;
      }
    } finally {
      this.off('patch', patchHandler);
    }
  }

  /**
   * Find documents matching query.
   * @param query - a query constructed with Q methods.
   * @return - an array of documents
   */
  public async find(query: Q.Query): Promise<Document[]> {
    const { filter, limit, skip, orderBy } = query.getParts();
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
        const { value } = JSON.parse(rawValue);
        if (value !== undefined /* Not a tombstone */ && wrappedMatch({ key, value }, filter)) {
          results.push({ key, value });
        }
        return it.next(next);
      };
      it.next(next);
    });
    const sortedResults = orderBy ? sortWith(orderBy.map(buildComparator), results) : results;
    return sortedResults.slice(skip, limit === undefined ? undefined : (skip || 0) + limit);
  }
}

export function buildComparator({ path: p, direction }: Q.Order) {
  return direction === Q.ASC ? ascend(path(p)) : descend(path(p));
}

export function wrappedMatch(doc: Document, filter: Q.Filter): boolean {
  const isMatch = match(doc, filter);
  if (isMatch === undefined) {
    throw new ValueError(`Got an unsupported filter operator: ${filter.operator}`);
  }
  return isMatch;
}

export function match(doc: Document, filter: Q.Filter): boolean {
  switch (filter.operator) {
    case 'and':
      return filter.filters.every((f) => wrappedMatch(doc, f));
    case 'or':
      return filter.filters.some((f) => wrappedMatch(doc, f));
    case 'not':
      return !wrappedMatch(doc, filter.filter);
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
    case 'isNull':
      return value === null;
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
    // We don't add a default case here to let typescript catch when new operators are added and not implemented here.
    // (see wrappedMatch)
  }
}