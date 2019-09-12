import * as db from '@reshuffle/db';

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

/**
 * @expose
 */
export async function getSecret() {
  return process.env.MY_SECRET;
}

export async function hack() {
  return 'HACKED';
}
