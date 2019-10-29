import { handler as defaultHandler } from '@reshuffle/server-function';
import express from 'express';

const app = express();
app.get('/express/hello', (_, res) => {
  res.end('hello from express');
});
app.use(defaultHandler);

export default app;
