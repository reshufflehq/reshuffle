import stream from 'stream';
import path from 'path';
import { v4 as uuid4 } from 'uuid';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import {
  Storage,
  PutOptions,
  FileInfo,
  FileInfoWithContent,
  UploadToken,
  InvalidTokenError,
} from './interfaces';

interface Config {
  basePath: string;
  baseUrl: string;
}

async function ignoreNotFound<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

export class LocalStorage implements Storage {
  constructor(
    protected readonly config: Config,
  ) {
  }

  public publicUrl(objectId: string): string {
    return `${this.config.baseUrl}/${objectId}`;
  }

  protected metaPath(objectId: string, prefix: string = ''): string {
    return path.join(this.config.basePath, `${prefix}${objectId}.meta`);
  }

  protected dataPath(objectId: string, prefix: string = ''): string {
    return path.join(this.config.basePath, `${prefix}${objectId}.data`);
  }

  public async createUpload(opts?: Partial<PutOptions>): Promise<{ token: string, signedUrl: string }> {
    const objectId = uuid4();
    await fs.writeFile(this.metaPath(objectId, 'tmp.'), JSON.stringify(opts || {}));
    return { token: objectId, signedUrl: `${this.config.baseUrl}/upload/${objectId}` };
  }

  public async upload(objectId: string, input: stream.Readable) {
    // Throws if file not found
    await fs.stat(this.metaPath(objectId, 'tmp.'));
    if (input instanceof Buffer) {
      await fs.writeFile(this.dataPath(objectId, 'tmp.'), input);
    } else {
      const output = createWriteStream(this.dataPath(objectId, 'tmp.'));
      input.pipe(output);
      await new Promise((resolve, reject) => {
        output.on('error', reject);
        output.on('close', resolve);
      });
    }
  }

  public async finalizeUpload(token: UploadToken): Promise<string> {
    const sourceId = typeof token === 'string' ? token : token.token;
    const objectId = uuid4();
    try {
      await Promise.all([
        fs.rename(this.metaPath(sourceId, 'tmp.'), this.metaPath(objectId)),
        fs.rename(this.dataPath(sourceId, 'tmp.'), this.dataPath(objectId)),
      ]);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new InvalidTokenError('Invalid token');
      }
      throw err;
    }
    return objectId;
  }

  public async put(input: Buffer | stream.Readable, opts: PutOptions): Promise<string> {
    const objectId = uuid4();
    await fs.writeFile(this.metaPath(objectId), JSON.stringify(opts));
    try {
      if (input instanceof Buffer) {
        await fs.writeFile(this.dataPath(objectId), input);
      } else {
        const output = createWriteStream(this.dataPath(objectId));
        input.pipe(output);
        await new Promise((resolve, reject) => {
          output.on('error', reject);
          output.on('close', resolve);
        });
      }
      return objectId;
    } catch (err) {
      await this.delete(objectId);
      throw err;
    }
  }

  public async head(id: string): Promise<FileInfo | undefined> {
    const [metaRaw, stat] = await Promise.all([
      ignoreNotFound(fs.readFile(this.metaPath(id), 'utf8')),
      ignoreNotFound(fs.stat(this.dataPath(id))),
    ]);
    if (metaRaw === undefined || stat === undefined) {
      return undefined;
    }
    const meta = JSON.parse(metaRaw);
    return {
      id,
      contentLength: stat.size,
      ...meta,
    };
  }

  protected async content(id: string): Promise<stream.Readable | undefined> {
    const handle = await ignoreNotFound(fs.open(this.dataPath(id), 'r'));
    if (handle === undefined) {
      return undefined;
    }
    return createReadStream('', { fd: handle.fd, autoClose: true });
  }

  public async get(id: string): Promise<FileInfoWithContent | undefined> {
    const [info, content] = await Promise.all([
      this.head(id),
      this.content(id),
    ]);
    if (info === undefined || content === undefined) {
      return undefined;
    }
    return { ...info, content };
  }

  public async delete(id: string): Promise<void> {
    await Promise.all([
      ignoreNotFound(fs.unlink(this.metaPath(id))),
      ignoreNotFound(fs.unlink(this.dataPath(id))),
    ]);
  }
}
