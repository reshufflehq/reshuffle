import express from 'express';
import storage from './storage';
import { makeContentTypeAcceptor } from './content-type';

function logError(...args: any[]) {
  // eslint-disable-next-line no-console
  console.error(...args);
}

export interface HandlerOpts {
  accept?: string | RegExp;
}

export default function createFileUploadHandler(opts?: HandlerOpts) {
  const router: express.Router = express.Router();
  const acceptContentType = makeContentTypeAcceptor(opts?.accept);

  router.post('/storage/upload/sign', express.json(), async (req, res) => {
    const { contentType } = req.body;
    if (!acceptContentType(contentType)) {
      res.statusCode = 400;
      res.json({ error: `Invalid contentType param: ${contentType}` });
      return;
    }

    try {
      res.json(await storage.createUpload({ contentType }));
    } catch (err) {
      logError(err);
      res.sendStatus(500);
    }
  });

  // IMPORTANT the following routes should not exist in production,
  // they're using to replace S3 in the local dev environment
  if (process.env.NODE_ENV !== 'production') {
    router.put('/storage/upload/:id', async (req, res) => {
      try {
        await (storage as any).upload(req.params.id, req);
        res.sendStatus(201);
      } catch (err) {
        logError(err);
        res.sendStatus(500);
      }
    });

    router.get('/storage/:id', async (req, res) => {
      try {
        const stored = await storage.get(req.params.id);
        if (stored === undefined) {
          res.sendStatus(404);
          return;
        }
        const { content, ...info } = stored;
        res.statusCode = 200;
        res.set('Content-Type', info.contentType);
        res.set('Content-Length', info.contentLength.toString());
        if (info.contentEncoding) {
          res.set('Content-Encoding', info.contentEncoding);
        }
        content.pipe(res);
      } catch (err) {
        logError(err);
        res.sendStatus(500);
      }
    });
  }

  return router;
}
