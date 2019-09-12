#!/usr/bin/env bash
set -euo pipefail

if ! grep -q 'react-scripts eject' package.json; then
  echo "Can not run outside of a create-react-app or an ejected project"
  exit 1
fi
if [ ! -f src/setupProxy.js ]; then
  cat >src/setupProxy.js <<EOF
const { setupProxy } = require('@reshuffle/local-proxy');

module.exports = setupProxy(__dirname);
EOF
  echo "Created src/setupProxy.js, please commit this file"
else
  echo "src/setupProxy.js exists, can not install Reshuffle"
  exit 1
fi
npm i @reshuffle/local-proxy
npm i @reshuffle/babel-macro
npm i @reshuffle/fetch-runtime
npm i @reshuffle/db
echo "Modified package.json, please commit this file"
if [ -f .gitignore ]; then
  if ! grep -q '^\.reshuffle\*' .gitignore ; then
    echo '.reshuffle*' >> .gitignore
    echo "Modified .gitignore, please commit this file"
  fi
else
  echo ".gitignore not found, not adding .reshuffle* to ignore"
fi
