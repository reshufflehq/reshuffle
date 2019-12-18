import * as db from '@reshuffle/db';
import storage from '@reshuffle/storage';

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

/**
 * @expose
 */
export async function saveImage(token) {
  const uploadedId = await storage.finalizeUpload(token);

  // Duplicate file to check functionality
  const { content, contentType: ctBefore, contentLength: lengthBefore } = await storage.get(uploadedId);
  const id = await storage.put(content, { contentType: ctBefore });

  if (lengthBefore !== 924) {
    throw new Error(`Expected contentLength to be 924, got: ${lengthBefore}`);
  }
  if (ctBefore !== 'image/png') {
    throw new Error(`Expected contentType image/png, got: ${ctBefore}`);
  }

  // Delete twice to test for exceptions if file not found
  await storage.delete(uploadedId);
  await storage.delete(uploadedId);

  const afterDelete  = await storage.get(uploadedId);
  if (afterDelete !== undefined) {
    throw new Error('Delete failed');
  }

  const { contentType: ctAfter, contentLength: lengthAfter } = await storage.head(id);
  if (lengthBefore !== lengthAfter) {
    throw new Error('Content length expected to be the same after put');
  }
  if (ctBefore !== ctAfter) {
    throw new Error('Content type expected to be the same after put');
  }

  return db.update('/image', () => ({ id, publicUrl: storage.publicUrl(id) }));
}
