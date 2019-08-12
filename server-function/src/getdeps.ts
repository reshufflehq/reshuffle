import fs from 'fs';
const contents = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const pjson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const pjsonDeps = pjson.dependencies;
const dependencies = contents.dependencies;
const listOfDeps = new Set();
const toProcess = Object.keys(pjsonDeps);
while (toProcess.length) {
  const p: string = toProcess.shift()!;
  // ignore bulk of react-scripts
  if (p === 'react-scripts') continue;
  // temporary until shift-db implementation changes to use client instead of leveldb
  if (p === '@binaris/shift-db') continue;
  // exclude local-proxy needed only for development
  if (p === '@binaris/shift-local-proxy') continue;
  // exclude already visited deps
  if (listOfDeps.has(p)) continue;
  listOfDeps.add(p);
  for (const subpackage of Object.keys(dependencies[p].requires || {})) {
    toProcess.push(subpackage);
  }
}
for (const dep of listOfDeps) {
  // tslint:disable-next-line:no-console
  console.log(dep);
}
