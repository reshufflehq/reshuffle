export type Updater = (value: any) => Promise<any>

export interface PersistentStoreStrategy {
  del: (key: string) => Promise<void>
  get: (key: string) => Promise<any>
  list: (prefix: string) => Promise<string[]>
  set: (key: string, value: any) => Promise<any>
  update: (key: string, updater: Updater) => Promise<any[]>
}
