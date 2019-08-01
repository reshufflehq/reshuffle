const fs = require('fs');
const contents = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const pjson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const pjsonDeps = pjson.dependencies;
const dependencies = contents.dependencies;
const listOfDeps = new Set();
const toProcess = Object.keys(pjsonDeps);
while (toProcess.length) {
  const p = toProcess.shift();
  if (p === 'react-scripts') continue;
  if (p === '@binaris/shift-db') continue;
  if (p === '@binaris/shift-local-proxy') continue;
  if (listOfDeps.has(p)) continue;
  listOfDeps.add(p);
  for (const subpackage of Object.keys(dependencies[p].requires || {})) {
    toProcess.push(subpackage);
  }
}
for (const dep of listOfDeps) {
  console.log(dep);
}
