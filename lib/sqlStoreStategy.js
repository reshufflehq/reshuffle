
class SQLStoreStategy {

  constructor(pool, table) {
    this.pool = pool;
    this.table = table;
    this.dbValidated = false;
  }

  async validateDB() {
    if (this.dbValidated) return true;
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS ${this.table} ` +
      '(id varchar primary key, value varchar);'
    );
    this.dbValidated = true;
    return true;
  }

  validateKey(key) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error(`Datastore: Invalid key: ${key}`);
      }
  }

  validateValue(value) {
    if (value === undefined) {
      throw new Error('Datastore: Invalid value: undefined');
    }
  }

  async del(key) {
    await this.validateDB();
    this.validateKey(key);
    await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [key]);
  }

  async get(key) {
    await this.validateDB();
    this.validateKey(key);
    const res = await this.pool.query(
      `SELECT value FROM ${this.table} WHERE id = $1`, [key]);
    return res.rowCount === 0 ? undefined : JSON.parse(res.rows[0].value);
  }

  async set(key, value) {
    await this.validateDB();
    this.validateKey(key);
    this.validateValue(value);
    await this.pool.query(
      `INSERT INTO ${this.table}(id, value) VALUES($1, $2) ` +
      'ON CONFLICT(id) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)],
    );
    return value;
  }


  async update(key, updater) {
    await this.validateDB();
    this.validateKey(key);

   
    const conn = await this.pool.connect();

    try {
      await conn.query('BEGIN');

      const res = await conn.query(
        `SELECT value FROM ${this.table} WHERE id = $1 FOR UPDATE`,
        [key],
      );
      const val = res.rowCount === 0 ?
        undefined :
        JSON.parse(res.rows[0].value);
      const oldValue = typeof val === 'object' ? { ...val } : val;

      const newValue = await updater(oldValue);
      if (newValue !== undefined) {
        if (oldValue === undefined) {
          await conn.query(
            `INSERT INTO ${this.table}(id, value) VALUES($1, $2)`,
            [key, JSON.stringify(newValue)],
          );
        } else {
          await conn.query(
            `UPDATE ${this.table} SET value = $2 WHERE id = $1`,
            [key, JSON.stringify(newValue)],
          );
        }
      }

      await conn.query('COMMIT');
      return [oldValue, newValue];

    } catch (e) {
      await conn.query('ROLLBACK');
      throw e;

    } finally {
      conn.release();
    }
  }
}
module.exports = {
  SQLStoreStategy: SQLStoreStategy,
}