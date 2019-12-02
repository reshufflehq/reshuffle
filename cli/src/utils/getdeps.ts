import { resolve as pathResolve } from 'path';
import { readFile } from 'mz/fs';
import { CLIError } from '@oclif/errors';
import has from 'lodash.has';

class MismatchedPackageAndPackageLockError extends CLIError {
  constructor(public missingPackage: string) {
    super(`Mismatched package files: package.json refers to ${missingPackage}, which is not in package-lock.json. Re-run "npm install".`);
  }
}

export interface PackageScope {
  dependencies?: Record<string, PackageScope>;
  requires?: Record<string, string>;
  bundled?: boolean;
}

export async function getDependencies(projectDir: string) {
  const packageJsonPath = pathResolve(projectDir, 'package.json');
  const packageLockPath = pathResolve(projectDir, 'package-lock.json');

  const { dependencies: lockDeps } = JSON.parse(await readFile(packageLockPath, 'utf8'));
  const { dependencies: pkgDeps } = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  const toProcess = Object.keys(pkgDeps);

  // If package.json contains packages that are not in
  // package-lock.json then they are out of sync.  Complain.
  const lockHasProperty = (p: string) => has(lockDeps, p);
  for (const p of toProcess) {
    if (!lockHasProperty(p)) {
      throw new MismatchedPackageAndPackageLockError(p);
    }
  }

  const dependencies = new Set<string>();
  while (toProcess.length) {
    const p = toProcess.shift()!;
    // ignore bulk of react-scripts
    if (p === 'react-scripts') continue;
    // exclude local-proxy needed only for development
    if (p === '@reshuffle/local-proxy') continue;
    // exclude code-transform needed only for development
    if (p === '@reshuffle/code-transform') continue;
    // exclude already visited deps
    if (dependencies.has(p)) continue;

    if (lockHasProperty(p)) {
      dependencies.add(p);
      toProcess.push(...deepRequires(lockDeps[p]));
    } else {
      // tslint:disable-next-line:no-console
      console.error(`WARN: Cannot find dependency ${p} in package-lock.json, skipping upload`);
    }
  }
  return dependencies;
}

function deepRequires(scope: PackageScope) {
  const deps = scope.dependencies || {};
  const reqs = Object.keys(scope.requires || {}).filter((req) =>
    deps[req] === undefined || !deps[req].bundled);
  for (const subscope of Object.values(deps)) {
    if (!subscope.bundled) {
      reqs.push(...deepRequires(subscope));
    }
  }
  return reqs;
}
