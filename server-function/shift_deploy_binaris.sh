#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
rm -rf .shift_deploy
npm run build
mkdir -p .shift_deploy/node_modules
cp -a build .shift_deploy
for i in $(node $DIR/getdeps.js) ; do
  dirtocreate=$(dirname node_modules/$i)
  mkdir -p .shift_deploy/$dirtocreate
  cp -a node_modules/$i .shift_deploy/$dirtocreate
done
cp -a `ls | grep -v node_modules | grep -v backend` .shift_deploy
cat >.shift_deploy/binaris.yml <<EOF
functions:
  public_shift_builtin:
    file: node_modules/@binaris/shift-server-function/dist/serveBinaris.js
    entrypoint: handler
    runtime: node8
EOF
./node_modules/.bin/babel --plugins @babel/plugin-transform-modules-commonjs backend/ -d .shift_deploy/backend
cd .shift_deploy && bn deploy public_shift_builtin && cd ..
