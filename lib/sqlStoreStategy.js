
class SQLStoreStategy {

  constructor(pool, table) {
    this.pool = pool;
    this.table = table;
    this.dbValidated = false;
  }

  async validateDB(){
    if(this.dbValidated) return true;
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS ${this.table} ` +
      '(id varchar primary key, value varchar);'
    );
    this.dbValidated = true;
    return true;
  }

  validateKey(key) {
    if (key && key.length === 0) {
      throw new Error('Datastore: Invalid empty key');
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
      `SELECT value FROM ${this.table} WHERE id = $1`,[key]);
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
}
module.exports = {
  SQLStoreStategy: SQLStoreStategy,
}