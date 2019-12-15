import stream from 'stream';

export type UploadToken = string | { token: string };

export interface PutOptions {
  contentType: string;
}

export interface FileInfo {
  id: string;
  contentLength: number;
  contentType: string;
  contentEncoding?: string;
}

export interface FileInfoWithContent extends FileInfo {
  content: stream.Readable;
}

export class InvalidTokenError extends Error {
  public readonly name: string = 'InvalidTokenError';
}

export interface Storage {
  publicUrl(objectId: string): string;
  createUpload(opts: PutOptions): Promise<{ token: string, signedUrl: string }>;
  finalizeUpload(token: UploadToken): Promise<string>;
  put(input: Buffer | stream.Readable, opts: PutOptions): Promise<string>;
  head(id: string): Promise<FileInfo | undefined>;
  get(id: string): Promise<FileInfoWithContent | undefined>;
  delete(id: string): Promise<void>;
}
