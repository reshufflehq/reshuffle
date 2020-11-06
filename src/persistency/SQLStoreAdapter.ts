import { PersistentStoreAdapter, Updater } from './types'

export default class SQLStoreAdapter implements PersistentStoreAdapter {
  private dbValidated = false

  constructor(private pool: any, private table: string) {}

  private async validateDB(): Promise<void> {
    if (!this.dbValidated) {
      await this.pool.query(
        `CREATE TABLE IF NOT EXISTS ${this.table} ` + '(id varchar primary key, value varchar);',
      )
      this.dbValidated = true
    }
  }

  public async del(key: string): Promise<void> {
    await this.validateDB()
    await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [key])
  }

  public async get(key: string): Promise<any> {
    await this.validateDB()
    const res = await this.pool.query(`SELECT value FROM ${this.table} WHERE id = $1`, [key])
    return res.rowCount === 0 ? undefined : JSON.parse(res.rows[0].value)
  }

  public async list(): Promise<string[]> {
    await this.validateDB()
    const res = await this.pool.query(`SELECT id FROM ${this.table}`)
    return res.rows.map((row: any) => row.id)
  }

  public async set(key: string, value: any): Promise<any> {
    await this.validateDB()
    await this.pool.query(
      `INSERT INTO ${this.table}(id, value) VALUES($1, $2) ` +
        'ON CONFLICT(id) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)],
    )
    return value
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    await this.validateDB()

    const conn = await this.pool.connect()

    try {
      await conn.query('BEGIN')

      const res = await conn.query(`SELECT value FROM ${this.table} WHERE id = $1 FOR UPDATE`, [
        key,
      ])
      const val = res.rowCount === 0 ? undefined : JSON.parse(res.rows[0].value)
      const oldValue = typeof val === 'object' ? { ...val } : val

      const newValue = await updater(oldValue)
      if (newValue !== undefined) {
        if (oldValue === undefined) {
          await conn.query(`INSERT INTO ${this.table}(id, value) VALUES($1, $2)`, [
            key,
            JSON.stringify(newValue),
          ])
        } else {
          await conn.query(`UPDATE ${this.table} SET value = $2 WHERE id = $1`, [
            key,
            JSON.stringify(newValue),
          ])
        }
      }

      await conn.query('COMMIT')
      return [oldValue, newValue]
    } catch (e) {
      await conn.query('ROLLBACK')
      throw e
    } finally {
      conn.release()
    }
  }
}
