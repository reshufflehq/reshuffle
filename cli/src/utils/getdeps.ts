import { resolve as pathResolve } from 'path';
import { readFile } from 'mz/fs';
import { CLIError } from '@oclif/errors';

class MismatchedPackageAndPackageLockError extends CLIError {
  constructor(public missingPackage: string) {
    super(`Mismatched package files: package.json refers to ${missingPackage}, which is not in package-lock.json.  Re-run "npm install".`);
  }
}

export async function getDependencies(projectDir: string) {
  const packageJsonPath = pathResolve(projectDir, 'package.json');
  const packageLockPath = pathResolve(projectDir, 'package-lock.json');

  const { dependencies: lockDeps } = JSON.parse(await readFile(packageLockPath, 'utf8'));
  const { dependencies: pkgDeps } = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  const toProcess = Object.keys(pkgDeps);

  // If package.json contains packages that are not in
  // package-lock.json then they are out of sync.  Complain.
  const lockHasProperty = Object.prototype.hasOwnProperty.bind(lockDeps);
  for (const p of toProcess) {
    if (!lockHasProperty(p)) {
      throw new MismatchedPackageAndPackageLockError(p);
    }
  }

  const dependencies = new Set<string>();
  while (toProcess.length) {
    const p: string = toProcess.shift()!;
    // ignore bulk of react-scripts
    if (p === 'react-scripts') continue;
    // exclude local-proxy needed only for development
    if (p === '@reshuffle/local-proxy') continue;
    // exclude code-transform needed only for development
    if (p === '@reshuffle/code-transform') continue;
    // exclude already visited deps
    if (dependencies.has(p)) continue;
    dependencies.add(p);
    for (const subpackage of Object.keys(lockDeps[p].requires || {})) {
      toProcess.push(subpackage);
    }
  }
  return dependencies;
}
