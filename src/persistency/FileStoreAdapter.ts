import { promises as fs } from 'fs'
import { Mutex } from 'async-mutex'
import isValidPath from 'is-valid-path'
import { PersistentStoreAdapter, Updater } from './types'

type Data = Record<string, any>

class FileData {
  private data: Data | undefined

  constructor(private path: string) {
    if (!isValidPath(path)) {
      throw new Error(`Invalid filesystem path: ${path}`)
    }
  }

  async read(): Promise<Data> {
    if (this.data) {
      return this.data
    }
    try {
      const json = await fs.readFile(this.path, 'utf-8')
      return (this.data = JSON.parse(json))
    } catch (e) {
      if (e.code === 'ENOENT') {
        return (this.data = {})
      } else {
        throw e
      }
    }
  }

  async write(): Promise<void> {
    const json = JSON.stringify(this.data || {})
    await fs.writeFile(this.path, json, 'utf-8')
  }
}

export default class FileStoreAdapter implements PersistentStoreAdapter {
  private fileData: FileData
  private mutex = new Mutex()

  constructor(path: string) {
    this.fileData = new FileData(path)
  }

  async del(key: string): Promise<void> {
    const data = await this.fileData.read()
    delete data[key]
    await this.fileData.write()
  }

  async get(key: string): Promise<any> {
    const data = await this.fileData.read()
    return data[key]
  }

  async list(): Promise<string[]> {
    const data = await this.fileData.read()
    return Object.keys(data)
  }

  async set(key: string, value: any): Promise<any> {
    const data = await this.fileData.read()
    data[key] = value
    await this.fileData.write()
    return value
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    const release = await this.mutex.acquire()

    try {
      const data = await this.fileData.read()

      const val = data[key]
      const oldValue = typeof val === 'object' ? { ...val } : val

      const newValue = await updater(oldValue)
      if (newValue !== undefined) {
        data[key] = newValue
        await this.fileData.write()
      }

      return [oldValue, newValue]
    } finally {
      release()
    }
  }
}
