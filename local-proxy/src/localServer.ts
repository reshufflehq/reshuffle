#!/usr/bin/env node
import express from 'express';
import { setupProxy } from './index';
import program from 'commander';
import path from 'path';

const NAME = 'reshuffle-local-server';
program.option('-p, --port <port>', 'listening port (3000 by default)');
program.description(`Run the ${NAME} outside of create-react-app server`);

function main() {
  program.parse(process.argv);
  // create the express app to route local requests
  const app = express();

  // reshuffle currently assumes running from src and uses
  // a relative path resolution to reach backend
  setupProxy(path.join(process.cwd(), 'src'))(app);

  const port = program.port === undefined ? 3000 : +program.port;
  const server = app.listen(port);
  server.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') {
      throw err;
    }
    console.error(`Error running ${NAME} on port ${port} - EADDRINUSE the port is used by a different program`);
    process.exit(1);
  });
  server.on('listening', () => {
    console.log(`${NAME} is listening on port ${port}`);
  });
}

main();
