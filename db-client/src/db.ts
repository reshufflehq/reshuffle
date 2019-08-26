import deepFreeze, { DeepReadonly } from 'deep-freeze';
import { DBClient, Options } from '@binaris/shift-interfaces-node-client';
import {
  ClientContext,
  Document,
  UpdateOptions,
  Version,
  VersionedMaybeObject,
  Serializable,
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

  public async find(query: Q.Query): Promise<Document[]> {
    return await this.client.find(this.ctx, query.getParts());
  }

  private async setIfVersion(
    key: string,
    value: Serializable,
    version: Version
  ): Promise<boolean> {
    return await this.client.setIfVersion(this.ctx, key, version, value);
  }
}
