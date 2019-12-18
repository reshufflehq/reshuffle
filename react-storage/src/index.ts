import { ChangeEventHandler, useCallback, useState } from 'react';
import axios from 'axios';
import fromPairs from 'lodash.frompairs';

export type UploadStatus = 'empty' | 'uploading' | 'complete' | 'error';

export interface Upload {
  file: File;
  uploading: boolean;
  complete: boolean;
  progress: number;
  signedUrl?: string;
  token?: string;
  error?: any;
}

function getStatus(uploadsArr: Upload[]): UploadStatus {
  if (uploadsArr.length === 0) {
    return 'empty';
  }
  if (uploadsArr.some(({ error }) => error)) {
    return 'error';
  }
  if (uploadsArr.every(({ complete }) => complete)) {
    return 'complete';
  }
  return 'uploading';
}

export function fileKey(file: File) {
  // TODO: support multiple files with same name
  return file.name;
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const startUpload = useCallback(async (files: File[]) => {
    const updatedUploads: Record<string, Upload> = fromPairs([...files].map((file) => {
      const key = fileKey(file);
      return [key, uploads[key] || { file, complete: false, uploading: false, progress: 0 }];
    }));
    setUploads(updatedUploads);
    await Promise.all(Object.entries(updatedUploads).map(async ([key, upload]) => {
      const { file } = upload;
      const updateUpload = (update: Partial<Upload>) =>
        setUploads((st) => ({ ...st, [key]: { ...st[key], ...update } }));

      try {
        let signedUrl: string;
        if (upload.signedUrl !== undefined) {
          signedUrl = upload.signedUrl;
        } else {
          const res = await fetch('/storage/upload/sign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contentType: file.type }),
          });
          const body = await res.json();
          signedUrl = body.signedUrl;
          updateUpload(body);
        }
        if (upload.uploading || upload.complete || upload.error) {
          return;
        }
        updateUpload({ uploading: true });
        // TODO: consider implementing this with XHR to remove the axios dependency
        await axios.put(signedUrl, file, {
          headers: {
            'Content-Type': file.type,
          },
          onUploadProgress: ({ loaded, total }) => updateUpload({ progress: loaded / total }),
        });
        updateUpload({ complete: true, uploading: false });
      } catch (error) {
        updateUpload({ error, uploading: false });
      }
    }));
  }, [uploads, setUploads]);

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const { files } = e.target;
    if (files === null) {
      startUpload([]);
    } else {
      startUpload(Array.from(files));
    }
  }, [startUpload]);

  const uploadsArr = Object.values(uploads);

  return {
    status: getStatus(uploadsArr),
    uploads: uploadsArr,
    startUpload,
    inputProps: { type: 'file', onChange },
  };
}
