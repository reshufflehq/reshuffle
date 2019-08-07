import path from 'path';
import fs from 'mz/fs';
import mimeTypes from 'mime-types';
import ms from 'milliseconds';
import fresh from 'fresh';

// create-react-app uses only 32 bits for hashes, allow caching for a limited
// time for lower chance of collision
const CACHE_TIME_SEC = ms.months(1) / 1000;
const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export async function isFile(filePath: string): Promise<fs.Stats | undefined> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() ? stats : undefined;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

export class Server {
  constructor(
    private directory: string,
    private extensions: string[] = ['.html'],
    private cachedPath = '/static',
  ) {
  }
  public async handle(url: string, headers: { [k: string]: string }): Promise<any> {
    if (url === '/invoke') {
      return { action: 'handleInvoke' };
    }
    if (url === '/') {
      return this.handle('/index.html', headers);
    }
    const fullPath = path.join(this.directory, url);
    if (UP_PATH_REGEXP.test(fullPath)) {
      return { action: 'sendStatus', status: 403 };
    }
    let foundPath: string | undefined;
    let foundStat: fs.Stats | undefined;
    // tslint:disable-next-line:no-conditional-assignment
    if (foundStat = await isFile(fullPath)) {
      foundPath = fullPath;
    }
    if (!foundPath) {
      for (const ext of this.extensions) {
        const p = `${fullPath + ext}`;
        // tslint:disable-next-line:no-conditional-assignment
        if (foundStat = await isFile(p)) {
          foundPath = p;
          break;
        }
      }
    }
    if (foundStat && foundPath) {
      const cacheHint = url.startsWith(this.cachedPath) ? {
        'last-modified': foundStat.mtime.toUTCString(),
        'cache-control': `public, max-age=${CACHE_TIME_SEC}`,
      } : {};
      if (fresh(headers, cacheHint)) {
        return {
          action: 'sendStatus', status: 304,
        };
      }
      return {
        action: 'serveFile',
        fullPath: foundPath,
        contentType: mimeTypes.contentType(path.extname(foundPath)),
        cacheHint,
      };
    }
    const notFoundPath = path.join(this.directory, '/404.html');
    if (await isFile(notFoundPath)) {
      return { action: 'sendStatus',
        status: 404,
        contentType: mimeTypes.contentType('404.html'),
        fullPath: notFoundPath,
      };
    }
    return { action: 'sendStatus', status: 404 };
  }
}
