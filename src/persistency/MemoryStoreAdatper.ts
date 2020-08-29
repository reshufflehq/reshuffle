import { Mutex } from 'async-mutex'
import { PersistentStoreAdapter, Updater } from './types'

export default class MemoryStoreAdapter implements PersistentStoreAdapter {
  private data: Record<string, any> = {}
  private mutex = new Mutex()

  async del(key: string): Promise<void> {
    delete this.data[key]
  }

  async get(key: string): Promise<any> {
    return this.data[key]
  }

  async list(): Promise<string[]> {
    return Object.keys(this.data)
  }

  async set(key: string, value: any): Promise<any> {
    return (this.data[key] = value)
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    const release = await this.mutex.acquire()

    try {
      const val = this.data[key]
      const oldValue = typeof val === 'object' ? { ...val } : val

      const newValue = await updater(oldValue)
      if (newValue !== undefined) {
        this.data[key] = newValue
      }

      return [oldValue, newValue]
    } finally {
      release()
    }
  }
}
