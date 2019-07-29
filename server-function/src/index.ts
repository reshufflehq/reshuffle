import path from 'path';
import fs from 'mz/fs';
import mimeTypes from 'mime-types';

const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

export class Server {
  constructor(private directory: string, private extensions: string[] = ['.html']) {
  }
  public async handle(url: string): Promise<any> {
    if (url === '/invoke') {
      return { action: 'handleInvoke' };
    }
    if (url === '/') {
      return this.handle('/index.html');
    }
    const fullPath = path.join(this.directory, url);
    if (UP_PATH_REGEXP.test(fullPath)) {
      return { action: 'sendStatus', status: 403 };
    }
    if (await isFile(fullPath)) {
      return { action: 'serveFile', fullPath, contentType: mimeTypes.contentType(path.extname(fullPath)) };
    }
    let foundPath: string | undefined;
    for (const ext of this.extensions) {
      const p = `${fullPath + ext}`;
      if (await isFile(p)) {
        foundPath = p;
        break;
      }
    }
    if (foundPath) {
      return { action: 'serveFile', fullPath: foundPath, contentType: mimeTypes.contentType(path.extname(foundPath)) };
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
