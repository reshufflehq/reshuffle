import { PersistentStoreAdapter, Updater } from './types'
import mssql from 'mssql'

export default class MSSQLStoreAdapter implements PersistentStoreAdapter {
  private dbValidated = false

  constructor(private pool: any, private table: string) {}

  private async validateDB(): Promise<void> {
    if (!this.dbValidated) {
      await this.pool.request().query(
        `IF OBJECT_ID('${this.table}', 'U') IS NULL CREATE TABLE ${this.table} (id varchar(250) primary key, value varchar(500))`,
      )
      this.dbValidated = true
    }
  }

  public async del(key: string): Promise<void> {
    await this.validateDB()
    await this.pool.request().input('id', key)
      .query(`DELETE FROM ${this.table} WHERE id = @id`)
  }

  public async get(key: string): Promise<any> {
    await this.validateDB()
    return await this.getValueForKey(key)
  }

  private async getValueForKey(key: string): Promise<any> {
    const res = await this.pool.request().input('id', key)
      .query(`SELECT value FROM ${this.table} WHERE id = @id`)
    const rows = res.recordset
    return rows?.length ? JSON.parse(rows[0].value) : undefined
  }

  private async insertUpdate(isInsert: boolean, key: string, value: string) {
    if (isInsert) {
      await this.pool.request().input('id', key)
      .input('value', value)
      .query(`INSERT INTO ${this.table} (id, value) VALUES(@id, @value)`)
    } else {
      await this.pool.request().input('id', key)
      .input('value', value)
      .query(`UPDATE ${this.table} SET value = @value WHERE id = @id`)
    }
  }

  public async list(): Promise<string[]> {
    await this.validateDB()
    const res = await this.pool.request().query(`SELECT id FROM ${this.table}`)
    const rows = res.recordset
    return rows?.length ? rows.map((row: any) => row.id) : undefined
  }

  public async set(key: string, value: any): Promise<any> {
    await this.validateDB()

    const transaction = new mssql.Transaction(this.pool)
    try {
      await transaction.begin()
      const valueForKey = await this.getValueForKey(key)
      await this.insertUpdate(valueForKey=== undefined, key, JSON.stringify(value))  
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
    return value
  }

  public async update(key: string, updater: Updater): Promise<any[]> {
    await this.validateDB()

    const transaction = new mssql.Transaction(this.pool)
    try {
      await transaction.begin()
      const val = await this.getValueForKey(key)
      const oldValue = typeof val === 'object' ? { ...val } : val
      const newValue = await updater(oldValue)
      if (newValue !== undefined) {
        await this.insertUpdate(oldValue=== undefined, key, JSON.stringify(newValue))  
      }
      await transaction.commit()
      return [oldValue, newValue]
    } catch (error) {
      await transaction.rollback()
      throw error
    } 
  }
}
