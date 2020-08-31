import { PersistentStoreAdapter, Updater } from './types'

export default class PersistentStore {
  private adapter: PersistentStoreAdapter

  constructor(backend: PersistentStore | PersistentStoreAdapter, private prefix: string = '') {
    if (typeof prefix !== 'string') {
      throw new Error(`PersistentStore: Invalid prefix: ${prefix}`)
    }
    this.adapter = backend instanceof PersistentStore ? backend.adapter : backend
  }

  public del(key: string): Promise<void> {
    this.validateKey(key)
    return this.adapter.del(this.prefix + key)
  }

  public get(key: string): Promise<any> {
    this.validateKey(key)
    return this.adapter.get(this.prefix + key)
  }

  public async list(): Promise<string[]> {
    const array = await this.adapter.list()
    return array.filter((key) => key.startsWith(this.prefix))
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
      throw new Error(`PersistentStore: Invalid key: ${key}`)
    }
  }

  public validateValue(value: any): void {
    if (value === undefined) {
      throw new Error(`PersistentStore: Invalid value: ${value}`)
    }
  }
}
