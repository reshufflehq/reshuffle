#!/usr/bin/env bash
if [ ! -f package.json ]; then
  echo "Can not run outside of a create-react-app project"
  exit 1
fi
npm i @binaris/shift-local-proxy
npm i @binaris/shift-babel-macro
npm i @binaris/shift-fetch-runtime
npm i @binaris/shift-db
if [ ! -f src/setupProxy.js ]; then
  cat >src/setupProxy.js <<EOF
const { setupProxy } = require('@binaris/shift-local-proxy');

module.exports = setupProxy(__dirname);
EOF
else
  echo "src/setupProxy.js exists, can not install shiftjs"
fi
if [ -f .gitignore ]; then
  if ! grep '\.shift\*' .gitignore ; then echo '.shift*' >> .gitignore ; fi
else
  echo ".gitignore not found, not adding .shift* to ignore"
fi
