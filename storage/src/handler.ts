import express from 'express';
import storage from './storage';

const router: express.Router = express.Router();

function logError(...args: any[]) {
  // eslint-disable-next-line no-console
  console.error(...args);
}

router.post('/storage/upload/sign', express.json(), async (req, res) => {
  const { contentType } = req.body;
  if (typeof contentType !== undefined && typeof contentType !== 'string') {
    res.statusCode = 400;
    res.json({ error: 'Expected contentType param to be missing or a string' });
    return;
  }

  try {
    res.json(await storage.createUpload({ contentType }));
  } catch (err) {
    logError(err);
    res.sendStatus(500);
  }
});

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

export default router;
