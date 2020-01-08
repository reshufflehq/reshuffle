import path, { resolve as pathResolve } from 'path';
import { mkdtemp, exists } from 'mz/fs';
import { mkdirp, remove, copy } from 'fs-extra';
import { tmpdir } from 'os';
import tar from 'tar';
import shellEcape from 'any-shell-escape';
import { spawn } from '@reshuffle/utils-subprocess';
import { getDependencies, MismatchedPackageAndPackageLockError } from './getdeps';

export { MismatchedPackageAndPackageLockError };

export interface Logger {
  log: (str: string) => void;
  error: (str: string) => void;
}

export interface BuildOptions {
  skipNpmInstall: boolean;
  logger: Logger;
}

const DEFAULT_OPTIONS: BuildOptions = {
  skipNpmInstall: false,
  logger: console,
};

function escapeWin32(filePath: string) {
  return process.platform === 'win32' ? shellEcape(filePath) : filePath;
}

export async function build(projectDir: string, options?: Partial<BuildOptions>): Promise<string> {
  const {
    skipNpmInstall,
    logger,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  logger.log('Building and bundling your app! This may take a few moments, please wait');
  const stagingDir = await mkdtemp(pathResolve(tmpdir(), 'reshuffle-bundle-'), { encoding: 'utf8' });

  // in win32 npm.cmd must be run in shell - no escaping needed since all
  // arguments are constant strings
  const shell = process.platform === 'win32';
  try {
    if (!skipNpmInstall) {
      await spawn('npm', ['install'], {
        cwd: projectDir,
        stdio: 'inherit',
        shell,
      });
    }
    await spawn('npm', ['run', 'build'], {
      cwd: projectDir,
      stdio: 'inherit',
      shell,
    });
    logger.log('Preparing backend...');
    const deps = await getDependencies(projectDir) as Map<string, {optional: boolean}>;
    for (const [dep, props] of deps) {
      const source = pathResolve(projectDir, 'node_modules', dep);
      const target = pathResolve(stagingDir, 'node_modules', dep);
      if (await exists(source)) {
        await mkdirp(target);
        await copy(source, target);
      } else if (!props.optional) {
        logger.error(`WARN: Cannot find dependency ${dep} in node_modules, skipping upload`);
      }
    }

    const filesToExclude = new Set(['node_modules', 'backend', 'src'].map((f) => pathResolve(projectDir, f)));
    await copy(projectDir, stagingDir, {
      filter(src) {
        return !filesToExclude.has(src) &&
          !(path.dirname(src) === projectDir && path.basename(src).startsWith('.'));
      },
    });

    await spawn(escapeWin32(pathResolve(projectDir, 'node_modules', '.bin', 'babel')), [
      '--no-babelrc',
      '--config-file',
      require.resolve('./babelBackendConfig.js'),
      '--source-maps',
      'true',
      '--plugins',
      ['@babel/plugin-transform-modules-commonjs',
        'module:@reshuffle/code-transform'].join(','),
      'backend/',
      '-d',
      escapeWin32(pathResolve(stagingDir, 'backend')),
    ], {
      cwd: projectDir,
      stdio: 'inherit',
      shell,
    });

    await copy(pathResolve(projectDir, 'backend'), pathResolve(stagingDir, 'backend'), {
      filter(src) {
        return path.extname(src) !== '.js';
      },
    });

    return stagingDir;

  } catch (err) {
    await remove(stagingDir);
    throw err;
  }

}

export async function createTarball(stagingDir: string): Promise<string> {
  const tarPath = pathResolve(stagingDir, 'bundle.tgz');
  await tar.create({
    gzip: true,
    file: tarPath,
    cwd: stagingDir,
    filter: (filePath) => filePath !== './bundle.tgz',
  }, ['.']);
  return tarPath;
}
