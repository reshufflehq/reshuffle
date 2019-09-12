import { resolve as pathResolve } from 'path';
import { readFile } from 'mz/fs';

export async function getDependencies(projectDir: string) {
  const packageJsonPath = pathResolve(projectDir, 'package.json');
  const packageLockPath = pathResolve(projectDir, 'package-lock.json');

  const { dependencies: lockDeps } = JSON.parse(await readFile(packageLockPath, 'utf8'));
  const { dependencies: pkgDeps } = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  const dependencies = new Set<string>();
  const toProcess = Object.keys(pkgDeps);
  while (toProcess.length) {
    const p: string = toProcess.shift()!;
    // ignore bulk of react-scripts
    if (p === 'react-scripts') continue;
    // exclude local-proxy needed only for development
    if (p === '@reshuffle/local-proxy') continue;
    // exclude already visited deps
    if (dependencies.has(p)) continue;
    dependencies.add(p);
    for (const subpackage of Object.keys(lockDeps[p].requires || {})) {
      toProcess.push(subpackage);
    }
  }
  return dependencies;
}
