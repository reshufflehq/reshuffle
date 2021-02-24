import { PersistentStoreAdapter, Updater } from './types'

export default class MySQLStoreAdapter implements PersistentStoreAdapter {
  private dbValidated = false

  constructor(private pool: any, private table: string) {}

  private async validateDB(): Promise<void> {
    if (!this.dbValidated) {
      await this.pool.query(
        `CREATE TABLE IF NOT EXISTS ${this.table} (id varchar(250) primary key, value varchar(500))`,
      )
      this.dbValidated = true
    }
  }

  public async del(key: string): Promise<void> {
    await this.validateDB()
    await this.pool.query(`DELETE FROM ${this.table} WHERE id = ?`, [key])
  }

  public async get(key: string): Promise<any> {
    await this.validateDB()
    const res = await this.pool.query(`SELECT value FROM ${this.table} WHERE id = ?`, [key])
    const rows = res[0]
    return rows?.length ? JSON.parse(rows[0].value) : undefined
  }

  public async list(): Promise<string[]> {
    await this.validateDB()
    const res = await this.pool.query(`SELECT id FROM ${this.table}`)
    const rows = res[0]
    return rows?.length ? rows.map((row: any) => row.id) : undefined
  }

  public async set(key: string, value: any): Promise<any> {
    await this.validateDB()
    const stringifyValue = JSON.stringify(value)
    const a = await this.pool.query(
      `INSERT INTO ${this.table} (id, value) VALUES(?, ?) ON DUPLICATE KEY UPDATE value = ?`,
      [key, stringifyValue, stringifyValue],
    )
    return value
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    await this.validateDB()

    const conn = await this.pool.getConnection()

    try {
      await conn.beginTransaction()

      const res = await conn.query(`SELECT value FROM ${this.table} WHERE id = ? FOR UPDATE`, [key])
      const rows = res[0]
      const val = rows.length === 0 ? undefined : JSON.parse(rows[0].value)
      const oldValue = typeof val === 'object' ? { ...val } : val

      const newValue = await updater(oldValue)
      if (newValue !== undefined) {
        if (oldValue === undefined) {
          await conn.query(`INSERT INTO ${this.table} (id, value) VALUES(?, ?)`, [
            key,
            JSON.stringify(newValue),
          ])
        } else {
          await conn.query(`UPDATE ${this.table} SET value = ? WHERE id = ?`, [
            JSON.stringify(newValue),
            key,
          ])
        }
      }
      await conn.commit()
      return [oldValue, newValue]
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }
}
