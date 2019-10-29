// tslint:disable:no-console
import path from 'path';
import nodemon from 'nodemon';
import proxy from 'http-proxy';
import { Application } from 'express';
import nanoid from 'nanoid';
import { EventEmitter } from 'events';
import net, { AddressInfo } from 'net';
import address from 'address';

const isTestEnv = process.env.NODE_ENV === 'test';

function log(message?: any, ...optionalParams: any[]) {
  if (!isTestEnv) {
    console.log(message, ...optionalParams);
  }
}

function logError(message?: any, ...optionalParams: any[]) {
  if (!isTestEnv) {
    console.error(message, ...optionalParams);
  }
}

function makePortPromise(portEmitter: EventEmitter): Promise<number> {
  return new Promise((resolve) => portEmitter.once('port', (port: number) => resolve(port)));
}

interface PortPromiseHolder {
  portPromise: Promise<number>;
}

function checkLocalHost(
  hostname: string,
  publicHost: string = address.ip(),
  listenHost: string = process.env.HOST || '0.0.0.0',
) {
  // always allow requests with explicit IPv4 or IPv6-address.
  // A note on IPv6 addresses:
  // hostHeader will always contain the brackets denoting
  // an IPv6-address in URLs,
  // these are removed from the hostname in url.parse(),
  // so we have the pure IPv6-address in hostname.
  if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
    return true;
  }
  // always allow localhost host, for convience
  if (hostname === 'localhost') {
    return true;
  }
  // allow hostname of listening adress
  if (hostname === listenHost) {
    return true;
  }
  // also allow public hostname if provided
  const idxPublic = publicHost.indexOf(':');

  const publicHostname = idxPublic >= 0 ? publicHost.substr(0, idxPublic) : publicHost;

  if (hostname === publicHostname) {
    return true;
  }
}

export function startProxy(
  rootDir: string,
  localToken: string,
): PortPromiseHolder {
  log('Dev server starting');
  const portEmitter = new EventEmitter();
  const promiseHolder = { portPromise: makePortPromise(portEmitter) };

  nodemon({
    watch: [
      path.join(rootDir, 'backend'),
    ],
    script: path.join(__dirname, 'server.js'),
    delay: 100,
    env: {
      RESHUFFLE_TMP_DIR: path.resolve(rootDir, '.reshuffle'),
      RESHUFFLE_DEV_SERVER_BASE_REQUIRE_PATH: path.resolve(rootDir, 'backend'),
      RESHUFFLE_DEV_SERVER_ROOT_DIR: rootDir,
      RESHUFFLE_DEV_SERVER_LOCAL_TOKEN: localToken,
    },
    // Workaround for tests:
    // server.js uses babel/dir which has a console.log
    // AVA (#1849) translates console.log to stderr
    // Rush detects stderr as warnings and returns an exit code
    stdout: !isTestEnv,
  });

  nodemon.on('quit', () => {
    process.exit();
  }).on('start', () => {
    logError('Local dev server started');
  }).on('message', (message: any) => {
    if (message.type === 'ready') {
      portEmitter.emit('port', message.port);
    }
  }).on('crash', () => {
    logError('Local dev server crashed');
    process.exit(1);
  }).on('restart', (files: string[]) => {
    promiseHolder.portPromise = makePortPromise(portEmitter);
    log('Local dev server restarted due to changes in: ', files);
  });
  return promiseHolder;
}

export function setupProxy(sourceDir: string) {
  const rootDir = path.resolve(sourceDir, '..');
  const localToken = nanoid();
  const httpProxy = new proxy();
  httpProxy.on('error', (err: any) => console.error(err.stack));
  return (app: Application) => {
    const promiseHolder = startProxy(rootDir, localToken);
    app.use(async (req, res, next) => {
      const { port: webappPort } = (req.socket.address() as AddressInfo);
      // pass empty headers since caching not used in local-proxy anyway
      if (!checkLocalHost(req.hostname)) {
        return res.sendStatus(403);
      }
      const port = await promiseHolder.portPromise;
      // Did this request come from our child process?
      const proxyRequest = req.get('x-reshuffle-dev-server-local-token') !== localToken;

      if (proxyRequest) {
        return httpProxy.web(req, res, {
          target: `http://localhost:${port}/`,
          headers: {
            'x-reshuffle-dev-server-local-token': localToken,
            'x-reshuffle-webapp-port': webappPort.toString(),
          },
        });
      }
      next();
    });
  };
}
