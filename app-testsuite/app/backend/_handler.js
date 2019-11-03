import { defaultHandler } from '@reshuffle/server-function';
import express from 'express';

const app = express();
app.get('/express/hello', (_, res) => {
  res.end('hello from express');
});
app.get('/express/variables', (req, res) => {
  res.json({ url: req.url, originalUrl: req.originalUrl });
});
app.use(defaultHandler);

export default app;
