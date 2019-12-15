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

  public async createUpload({ contentType }: PutOptions): Promise<{ token: string, signedUrl: string }> {
    const objectId = uuid4();
    const signedUrl = await this.s3.getSignedUrlPromise('putObject', {
      Bucket: this.config.bucket,
      Key: `tmp/${this.config.keyPrefix}/${objectId}`,
      Expires: Math.floor(this.config.uploadExpirationMs / 1000),
      ContentType: contentType,
    });
    return { token: objectId, signedUrl };
  }

  protected putOpts(objectId: string) {
    const key = `${this.config.keyPrefix}/${objectId}`;
    return {
      Bucket: this.config.bucket,
      Key: key,
      ACL: 'public-read',
    };
  }

  public async finalizeUpload(token: UploadToken): Promise<string> {
    const sourceId = typeof token === 'string' ? token : token.token;
    const source = `/${this.config.bucket}/tmp/${this.config.keyPrefix}/${sourceId}`;
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
    const key = `${this.config.keyPrefix}/${id}`;
    try {
      const { ContentLength, ContentType, ContentEncoding } = await this.s3.headObject({
        Bucket: this.config.bucket,
        Key: key,
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
    const key = `${this.config.keyPrefix}/${id}`;
    const req = this.s3.getObject({
      Bucket: this.config.bucket,
      Key: key,
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
    const key = `${this.config.keyPrefix}/${id}`;
    await this.s3.deleteObject({
      Bucket: this.config.bucket,
      Key: key,
    }).promise();
  }
}
