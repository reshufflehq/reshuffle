import path from 'path';
import fs from 'fs';
import ms from 'ms';
import env from 'env-var';
import { Storage } from './interfaces';
import { CloudStorage } from './cloud';
import { LocalStorage } from './local';

const envStr = (name: string): string => {
  const val = env.get(name).required().asString();
  if (val === '') {
    throw new Error(`${name} is env var is empty`);
  }
  return val;
};

let storage: Storage;

if (process.env.NODE_ENV === 'production') {
  storage = new CloudStorage({
    region: envStr('RESHUFFLE_STORAGE_REGION'),
    cdnBaseUrl: envStr('RESHUFFLE_STORAGE_CDN_BASE_URL'),
    bucket: envStr('RESHUFFLE_STORAGE_S3_BUCKET'),
    keyPrefix: envStr('RESHUFFLE_STORAGE_S3_KEY_PREFIX'),
    uploadExpirationMs: ms('1h'),
    credentials: {
      accessKeyId: envStr('RESHUFFLE_STORAGE_AWS_ACCESS_KEY_ID'),
      secretAccessKey: envStr('RESHUFFLE_STORAGE_AWS_SECRET_ACCESS_KEY'),
      sessionToken: process.env.RESHUFFLE_STORAGE_AWS_SESSION_TOKEN,
    },
  });
} else {
  const basePath = path.join(envStr('RESHUFFLE_TMP_DIR'), 'storage');
  try {
    fs.mkdirSync(basePath);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }

  storage = new LocalStorage({
    baseUrl: '/storage',
    basePath,
  });
}

export default storage;
