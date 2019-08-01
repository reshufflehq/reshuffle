#!/usr/bin/env bash
set -euo pipefail

rm -rf .shift_deploy
npm run build
mkdir -p .shift_deploy/node_modules
cp -a build .shift_deploy
for i in $(node getdeps.js) ; do
  dirtocreate=$(dirname node_modules/$i)
  mkdir -p .shift_deploy/$dirtocreate
  cp -a node_modules/$i .shift_deploy/$dirtocreate
done
cp -a `ls | grep -v node_modules | grep -v backend` .shift_deploy
cat >.shift_deploy/binaris.yml <<EOF
functions:
  public_shift_builtin:
    file: function.js
    entrypoint: handler
    runtime: node8
EOF
cat >.shift_deploy/function.js <<EOF
const fs = require('fs');
const { Server } = require('@binaris/shift-server-function');
const pathResolve = require('path').resolve;
const shiftServer = new Server('./build');

exports.handler = async function (body, ctx) {
  const url = ctx.request.path;
  const decision = await shiftServer.handle(url);
console.error(decision);
console.error(url);
  switch (decision.action) {
    case 'handleInvoke': {
      const { path, handler, args } = body;
      const joinedDir = pathResolve('./backend', path);
      const mod = require(joinedDir);
      const fn = mod[handler];
      return fn(...args);
    }
    case 'sendStatus': {
      return new ctx.HTTPResponse({
        statusCode: decision.status
      });
    }
    case 'serveFile': {
      return new ctx.HTTPResponse({
        statusCode: 200,
        headers: { 'Content-Type': decision.contentType },
        body: fs.readFileSync(decision.fullPath)
      });
    }
    default: throw new Error('huh');
  }
}
EOF
./node_modules/.bin/babel --plugins @babel/plugin-transform-modules-commonjs backend/ -d .shift_deploy/backend
cd .shift_deploy && bn deploy public_shift_builtin && cd ..
