import stream from 'stream';
import { S3 } from 'aws-sdk';
import { v4 as uuid4 } from 'uuid';
import {
  Storage,
  PutOptions,
  FileInfo,
  FileInfoWithContent,
  UploadToken,
  InvalidTokenError,
} from './interfaces';

interface Config {
  region: string;
  cdnBaseUrl: string;
  bucket: string;
  keyPrefix: string;
  uploadExpirationMs: number;
}

export class CloudStorage implements Storage {
  constructor(
    protected readonly config: Config,
    protected readonly s3: S3 = new S3({ region: config.region }),
  ) {
  }

  public publicUrl(objectId: string): string {
    return `${this.config.cdnBaseUrl}/${this.config.keyPrefix}/${objectId}`;
  }

  protected key(objectId: string, prefix: string = ''): string {
    return `${prefix}${this.config.keyPrefix}/${objectId}`;
  }

  public async createUpload(opts?: Partial<PutOptions>): Promise<{ token: string, signedUrl: string }> {
    const objectId = uuid4();
    const signedUrl = await this.s3.getSignedUrlPromise('putObject', {
      Bucket: this.config.bucket,
      Key: this.key(objectId, 'tmp/'),
      Expires: Math.floor(this.config.uploadExpirationMs / 1000),
      ContentType: opts && opts.contentType,
    });
    return { token: objectId, signedUrl };
  }

  protected putOpts(objectId: string) {
    return {
      Bucket: this.config.bucket,
      Key: this.key(objectId),
      ACL: 'public-read',
    };
  }

  public async finalizeUpload(token: UploadToken): Promise<string> {
    const sourceId = typeof token === 'string' ? token : token.token;
    const source = `/${this.config.bucket}/${this.key(sourceId, 'tmp/')}`;
    const objectId = uuid4();
    try {
      await this.s3.copyObject({
        ...this.putOpts(objectId),
        Bucket: this.config.bucket,
        CopySource: source,
      }).promise();
      return objectId;
    } catch (err) {
      if (err.code === 'NoSuchKey') {
        throw new InvalidTokenError('Invalid token');
      }
      throw err;
    }
  }

  public async put(input: Buffer | stream.Readable, opts: PutOptions): Promise<string> {
    const objectId = uuid4();
    await this.s3.putObject({
      ...this.putOpts(objectId),
      ContentType: opts.contentType,
      Body: input,
    }).promise();
    return objectId;
  }

  public async head(id: string): Promise<FileInfo | undefined> {
    try {
      const { ContentLength, ContentType, ContentEncoding } = await this.s3.headObject({
        Bucket: this.config.bucket,
        Key: this.key(id),
      }).promise();
      if (ContentLength === undefined || ContentType === undefined) {
        throw new Error('Missing expected properties');
      }

      return {
        id,
        contentLength: ContentLength,
        contentType: ContentType,
        contentEncoding: ContentEncoding,
      };
    } catch (err) {
      if (err.code === 'NotFound' || err.code === 'NoSuchKey') {
        return undefined;
      }
      throw err;
    }
  }

  protected content(id: string): stream.Readable {
    const req = this.s3.getObject({
      Bucket: this.config.bucket,
      Key: this.key(id),
    });
    return req.createReadStream();
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
    await this.s3.deleteObject({
      Bucket: this.config.bucket,
      Key: this.key(id),
    }).promise();
  }
}
