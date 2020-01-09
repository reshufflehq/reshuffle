#!/usr/bin/env node
import express from 'express';
import { setupProxy } from './index';
import yargs from 'yargs';
import path from 'path';
import { AddressInfo } from 'net';

const NAME = 'reshuffle-local-server';
yargs
  .command(
    '$0 [options]',
    `Run the ${NAME} outside of create-react-app server`,
    (y) => y
      .option('port', {
        describe: 'listening port (3000 by default)',
        alias: 'p',
        default: 3000,
        type: 'number',
      })
      // yargs doesn't check that number is a number
      .check((argv) => Number.isFinite(argv.port)),
    (y) => main(y.port)
  )
  .help()
  .parse();

function main(port: number) {
  // create the express app to route local requests
  const app = express();

  // reshuffle currently assumes running from src and uses
  // a relative path resolution to reach backend
  setupProxy(path.join(process.cwd(), 'src'))(app);

  const server = app.listen(port);
  server.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') {
      throw err;
    }
    console.error(`Error running ${NAME} on port ${port} - EADDRINUSE the port is used by a different program`);
    process.exit(1);
  });
  server.on('listening', () => {
    console.log(`${NAME} is listening on port ${(server.address() as AddressInfo).port}`);
  });
}
