#!/usr/bin/env bash
set -euo pipefail

if ! grep -q 'react-scripts eject' package.json; then
  echo "Can not run outside of a create-react-app or an ejected project"
  exit 1
fi
if [ ! -f src/setupProxy.js ]; then
  cat >src/setupProxy.js <<EOF
const { setupProxy } = require('@binaris/shift-local-proxy');

module.exports = setupProxy(__dirname);
EOF
  echo "Created src/setupProxy.js, please commit this file"
else
  echo "src/setupProxy.js exists, can not install shiftjs"
  exit 1
fi
npm i @binaris/shift-local-proxy
npm i @binaris/shift-babel-macro
npm i @binaris/shift-fetch-runtime
npm i @binaris/shift-db
echo "Modified package.json, please commit this file"
if [ -f .gitignore ]; then
  if ! grep -q '^\.shift\*' .gitignore ; then
    echo '.shift*' >> .gitignore
    echo "Modified .gitignore, please commit this file"
  fi
else
  echo ".gitignore not found, not adding .shift* to ignore"
fi
