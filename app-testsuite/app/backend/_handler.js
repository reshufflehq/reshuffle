import { defaultHandler } from '@reshuffle/server-function';
import { createFileUploadHandler } from '@reshuffle/storage';
import express from 'express';

const routes = express();
routes.get('/hello', (_, res) => {
  res.end('hello from express');
});
routes.get('/variables', (req, res) => {
  res.json({ url: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl });
});
const app = express();

app.use(createFileUploadHandler({ accept: 'image/png' }));

// Parse JSON always - tests that json() doesn't break other functionality
app.use(express.json());
app.use('/express', routes);
app.use(defaultHandler);

export default app;
