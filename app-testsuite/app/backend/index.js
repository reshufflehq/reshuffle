import * as db from '@binaris/shift-db';

/**
 * @expose
 */
export async function update(key, value) {
  return db.update(key, () => value);
}

/**
 * @expose
 */
export async function get(key) {
  return db.get(key);
}
