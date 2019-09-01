import { DBClient, Options } from '@binaris/shift-interfaces-node-client';
import {
  ClientContext,
  Document,
  Patch,
  PollOptions,
  Serializable,
  UpdateOptions,
  Version,
  VersionedMaybeObject,
} from '@binaris/shift-interfaces-node-client/interfaces';

import * as Q from './query';

export { Q };

export interface Versioned<T extends Serializable | undefined> {
  version: Version;
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

export class DB {
  private readonly client: DBClient;

  constructor(url: string, private readonly ctx: ClientContext, options?: Options) {
    this.client = new DBClient(url, options);
  }

  public async get<T extends Serializable = any>(key: string): Promise<T | undefined> {
    return (await this.client.get(this.ctx, key)) as T;
  }

  public async create(key: string, value: Serializable): Promise<boolean> {
    checkValue(value);
    return this.client.create(this.ctx, key, value);
  }

  public async remove(key: string): Promise<boolean> {
    return this.client.remove(this.ctx, key);
  }

  public async update<T extends Serializable = any>(
    key: string, updater: (state?: Readonly<T>) => T, options?: UpdateOptions,
  ): Promise<Readonly<T>> {
    for (const delay of backoff()) {
      const { value, version } = await this.getWithVersion(key);
      const newValue = updater(value as T);
      checkValue(newValue);
      if (await this.setIfVersion(key, version, newValue, options)) return newValue;
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
