import { join as pathJoin } from 'path';
import { inspect } from 'util';
import net from 'net';
import http from 'http';
import express, { json } from 'express';

const basePath = process.env.SHIFT_DEV_SERVER_BASE_REQUIRE_PATH;
if (!basePath) {
  throw new Error('SHIFT_DEV_SERVER_BASE_REQUIRE_PATH env var not defined');
}
const app = express();

app.post('/invoke', json(), async (req, res) => {
  try {
    // TODO: validate request
    const { path, handler, args } = req.body;
    // Make sure we use basePath as absolute path
    const mod = require(pathJoin(basePath, path));
    const fn = mod[handler];
    // TODO: check function is exposed
    const ret = await fn(...args);
    res.json(ret);
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Failed to invoke function', err);
    res.status(500).json({ error: inspect(err) });
  }
});

if (process.send) process.send('ready');
process.on('message', (m, netServer) => {
  if (m === 'server') {
    const httpServer = http.createServer(app);
    (netServer as net.Server).on('connection', (socket) => httpServer.emit('connection', socket));
  }
});
