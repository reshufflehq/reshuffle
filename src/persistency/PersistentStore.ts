import objhash from 'object-hash'
import { PersistentStoreAdapter, Updater } from './types'

export default class PersistentStore {
  constructor(private adapter: PersistentStoreAdapter, private prefix: string = '') {
    if (typeof prefix !== 'string') {
      throw new Error(`Datastore: Invalid prefix: ${prefix}`)
    }
  }

  public createNamespace(prefix: string): PersistentStore {
    return new PersistentStore(this.adapter, prefix)
  }

  public createServiceNamespace(service: string, options: Record<string, any>): PersistentStore {
    if (typeof service !== 'string' || !/^[a-z][a-z0-9]*$/.test(service)) {
      throw new Error(`Datastore: Invalid service: ${service}`)
    }
    if (options !== undefined && typeof options !== 'object') {
      throw new Error(`Datastore; Invalid options: ${options}`)
    }
    const prefix: string[] = [service, ':']
    if (options) {
      prefix.push(objhash(options))
      prefix.push(':')
    }
    return this.createNamespace(prefix.join(''))
  }

  public del(key: string): Promise<void> {
    this.validateKey(key)
    return this.adapter.del(this.prefix + key)
  }

  public get(key: string): Promise<any> {
    this.validateKey(key)
    return this.adapter.get(this.prefix + key)
  }

  public list(): Promise<string[]> {
    return this.adapter.list(this.prefix)
  }

  public set(key: string, value: any): Promise<any> {
    this.validateKey(key)
    this.validateValue(value)
    return this.adapter.set(this.prefix + key, value)
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    this.validateKey(key)
    return this.adapter.update(this.prefix + key, updater)
  }

  public validateKey(key: string): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error(`Datastore: Invalid key: ${key}`)
    }
  }

  public validateValue(value: any): void {
    if (value === undefined) {
      throw new Error(`Datastore: Invalid value: ${value}`)
    }
  }
}
