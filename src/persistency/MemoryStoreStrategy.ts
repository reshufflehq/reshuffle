import { PersistentStoreStrategy, Updater } from './types'

export default class MemoryStoreStrategy implements PersistentStoreStrategy {
  private data: Record<string, any> = {}

  async del(key: string): Promise<void> {
    delete this.data[key]
  }

  async get(key: string): Promise<any> {
    return this.data[key]
  }

  async list(prefix = ''): Promise<string[]> {
    return Object.keys(this.data).filter((key) => key.startsWith(prefix))
  }

  async set(key: string, value: any): Promise<any> {
    return (this.data[key] = value)
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    const val = this.data[key]
    const oldValue = typeof val === 'object' ? { ...val } : val

    const newValue = await updater(oldValue)
    if (newValue !== undefined) {
      this.data[key] = newValue
    }

    return [oldValue, newValue]
  }
}
