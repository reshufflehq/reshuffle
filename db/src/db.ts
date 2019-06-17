import LevelUpCtor, { LevelUp } from 'levelup';
import LevelDown from 'leveldown';
import { Mutex } from 'async-mutex';

export class KeyError extends Error {
  public readonly name = 'KeyError';
}

export class KeyAlreadyExistsError extends Error {
  public readonly name = 'KeyAlreadyExistsError';
}

export class DB {
  protected readonly writeLock = new Mutex();
  protected readonly db: LevelUp;
  constructor(protected readonly dbPath: string) {
    this.db = new LevelUpCtor(new LevelDown(dbPath));
  }

  /**
   * Gets a single document, throws KeyError in case key does not exist.
   */
  public async get(key: string): Promise<object> {
    try {
      const val = await this.db.get(key);
      return JSON.parse(val.toString());
    } catch (err) {
      if (err.name === 'NotFoundError') {
        throw new KeyError(`${key} not found`);
      }
      throw err;
    }
  }

  /**
   * Creates a document, throws `KeyAlreadyExistsError if key already exists.
   */
  public async create(key: string, value: object): Promise<void> {
    await this.writeLock.runExclusive(async () => {
      try {
        await this.get(key);
      } catch (err) {
        if (err.name !== 'KeyError') {
          throw err;
        }
        await this.db.put(key, JSON.stringify(value));
        return;
      }
      throw new KeyAlreadyExistsError(`${key} aleady exists`);
    });
  }

  /**
   * Updates a single document.
   *
   * @param updater - Function that gets the previous value and returns the next value.
   * @param initializer - `updater` will get this value if no document exists for `key`.
   */
  public async update<T extends object, R extends object>(
    key: string, updater: (state?: T) => R, initializer?: T
  ): Promise<void> {
    await this.writeLock.runExclusive(async () => {
      let prev: any = initializer;
      try {
        prev = await this.get(key);
      } catch (err) {
        if (err.name !== 'KeyError') {
          throw err;
        }
      }
      const next = updater(prev);
      await this.db.put(key, JSON.stringify(next));
    });
  }

  /**
   * Removes a single document or throws KeyError in case key does not exist.
   */
  public async remove(key: string): Promise<void> {
    await this.writeLock.runExclusive(async () => {
      await this.get(key);
      await this.db.del(key);
    });
  }
}
