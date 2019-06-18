// tslint:disable:no-console
import path from 'path';
import net from 'net';
import nodemon from 'nodemon';
import proxy from 'http-proxy-middleware';
import { Application } from 'express';
import nanoid from 'nanoid';

export async function startProxy(rootDir: string, localToken: string) {
  const server = net.createServer();

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', resolve);
    server.once('error',  reject);
    return server;
  });
  const { port } = server.address() as net.AddressInfo;

  console.log(`Dev server listening on port: ${port}`);

  nodemon({
    watch: [
      path.join(rootDir, 'backend'),
    ],
    script: path.join(__dirname, 'server.js'),
    delay: 100,
    env: {
      SHIFT_DB_PATH: path.join(rootDir, 'shift.db'),
      SHIFT_DEV_SERVER_BASE_REQUIRE_PATH: path.resolve(path.join(rootDir, 'backend')),
      SHIFT_LOCAL_TOKEN: localToken,
    },
  });

  let handle: any;

  nodemon.on('quit', () => {
    process.exit();
  }).on('start', (child) => {
    handle = child;
  }).on('message', (message) => {
    if (message === 'ready' && handle !== undefined) {
      handle.send('server', server);
    }
  }).on('restart', (files) => {
    console.log('Local dev server restarted due to changes in: ', files);
  });

  return port;
}

export function setupProxy(sourceDir: string) {
  const rootDir = path.resolve(sourceDir, '..');
  const localToken = nanoid();
  return async (app: Application) => {
    const port = await startProxy(rootDir, localToken);
    app.use(proxy('/invoke', { target: `http://localhost:${port}/`, headers: { 'x-shift-local-token': localToken } }));
  };
}
