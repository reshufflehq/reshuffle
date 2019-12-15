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

  public async createUpload(opts: PutOptions): Promise<{ token: string, signedUrl: string }> {
    const objectId = uuid4();
    await fs.writeFile(this.metaPath(objectId, 'tmp.'), JSON.stringify(opts));
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
  }

  public async head(id: string): Promise<FileInfo | undefined> {
    try {
      const [metaRaw, { size }] = await Promise.all([
        fs.readFile(this.metaPath(id), 'utf8'),
        fs.stat(this.dataPath(id)),
      ]);
      const meta = JSON.parse(metaRaw);
      return {
        id,
        contentLength: size,
        ...meta,
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return undefined;
      }
      throw err;
    }
  }

  protected content(id: string): stream.Readable {
    return createReadStream(this.dataPath(id));
  }

  public async get(id: string): Promise<FileInfoWithContent | undefined> {
    const info = await this.head(id);
    if (info === undefined) {
      return undefined;
    }
    const content = this.content(id);
    return { ...info, content };
  }

  public async delete(id: string): Promise<void> {
    try {
      await Promise.all([
        fs.unlink(this.metaPath(id)),
        fs.unlink(this.dataPath(id)),
      ]);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return;
      }
      throw err;
    }
  }
}
