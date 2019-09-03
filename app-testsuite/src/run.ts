// tslint:disable:no-console
import path from 'path';
import { promisify } from 'util';
import { mkdtemp, readFile } from 'fs';
import { tmpdir } from 'os';
import { spawn as spawnChild, ChildProcess } from 'child_process';
import { copy, remove, pathExists } from 'fs-extra';
import { Tail } from 'tail';
import { spawn, waitOnChild } from '@binaris/utils-subprocess';

const shell = process.platform === 'win32';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const REGISTRY_URL = 'http://localhost:4873/';

async function readUntilPattern(stream: NodeJS.ReadableStream, pattern: RegExp) {
  let out = '';
  await new Promise((resolve, reject) => {
    stream.on('data', (l) => {
      out += l.toString();
      if (pattern.test(out)) {
        resolve();
      }
    });
    stream.on('end', () => reject(new Error(`Expected pattern not found: ${pattern}`)));
    stream.on('error', (err) => reject(err));
  });
}

async function killGroup(child: ChildProcess, signal: string = 'SIGINT') {
  // TODO: support windows (-pid is unix only)
  process.kill(-child.pid, signal);
  try {
    await waitOnChild(child);
  } catch (err) {
    if (!(err.name === 'ChildProcessError' && err.signal === signal)) {
      throw err;
    }
  }
}

async function untilExists(file: string, attempts: number, sleepDuration: number = 1000) {
  for (let attempt = 1; attempt < attempts; attempt++) {
    if (await pathExists(file)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, sleepDuration));
  }
  throw new Error(`Path ${path} does not exist`);
}

class Registry {
  protected constructor(
    protected proc: ChildProcess, public readonly workdir: string
  ) {
  }

  public static async create(workdir: string) {
    await copy(path.resolve(__dirname, '..', 'verdaccio.yaml'), path.resolve(workdir, 'verdaccio.yaml'));

    const proc = spawnChild('npx', ['verdaccio', '-c', 'verdaccio.yaml'], {
      cwd: workdir,
      stdio: 'inherit',
      shell,
      detached: true,
    });
    return new this(proc, workdir);
  }

  public async ready() {
    const logPath = path.resolve(this.workdir, 'verdaccio.log');
    await untilExists(logPath, 30);
    const tail = new Tail(logPath, {
      fromBeginning: true,
    });
    try {
      await new Promise((resolve, reject) => {
        tail.on('line', (line) => {
          const log = JSON.parse(line);
          if (log.addr) {
            resolve();
          }
        });

        tail.on('error', reject);
        setTimeout(() => reject(new Error('Timed out waiting for verdaccio')), 30 * 1000);
      });
    } finally {
      tail.unwatch();
    }
  }

  public destroy() {
    return killGroup(this.proc);
  }

  public async createToken() {
    await spawn('npx', [
      'npm-auth-to-token',
      '-u', 'user',
      '-p', 'password',
      '-e', 'user@example.com',
      '-r', REGISTRY_URL,
    ], {
      cwd: this.workdir,
      stdio: 'inherit',
      shell,
    });
    const npmrc = await promisify(readFile)(path.resolve(this.workdir, '.npmrc'), 'utf8');
    const line = npmrc.split('\n').find((l) => /:_authToken=/.test(l));
    if (!line) {
      throw new Error('No auth token created');
    }
    return line.split('=')[1];
  }
}

function publishToLocalRegistry(token: string) {
  return spawn('node', [
    path.resolve(ROOT_DIR, 'common', 'scripts', 'install-run-rush.js'),
    'publish',
    '--publish',
    '--include-all',
    '--set-access-level', 'public',
    '--registry', REGISTRY_URL,
    '--npm-auth-token', token,
  ], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell,
  });
}

async function main() {
  const testDir = await promisify(mkdtemp)(path.resolve(tmpdir(), 'test'));
  console.log('Created test dir', testDir);
  try {
    console.log('Starting local registry');
    const registry = await Registry.create(testDir);
    try {
      await registry.ready();
      console.log('Creating local registry token');
      const token = await registry.createToken();
      console.log('Publishing to local registry');
      await publishToLocalRegistry(token);
      const appName = 'my-app';
      const appDir = path.resolve(testDir, appName);

      console.log('Creating react app');
      await spawn('npx', ['create-react-app', appName], {
        cwd: testDir,
        stdio: 'inherit',
        shell,
      });
      console.log('Reshuffling');
      await spawn('node', [path.resolve(ROOT_DIR, 'shiftjs-react-app', 'index.js')], {
        cwd: appDir,
        stdio: 'inherit',
        shell,
        env: {
          ...process.env,
          NPM_CONFIG_REGISTRY: REGISTRY_URL,
        },
      });
      await copy(path.resolve(__dirname, '..', 'app'), appDir);

      console.log('Starting app');
      const reactApp = spawnChild('npm', ['start'], {
        cwd: appDir,
        stdio: 'pipe',
        detached: true,
        shell,
        env: {
          ...process.env,
          BROWSER: 'none',
        },
      });
      await readUntilPattern(reactApp.stdout, /You can now view my-app in the browser/);
      try {
        console.log('Running tests');
        await spawn('npx', ['cypress', 'run'], {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit',
          shell,
          env: {
            ...process.env,
            CYPRESS_baseUrl: 'http://localhost:3000',
          },
        });
      } finally {
        console.log('Killing app');
        await killGroup(reactApp);
      }
    } finally {
      await registry.destroy();
    }
  } finally {
    await remove(testDir);
  }
}

main()
  .then(() => {
    console.log('Great success!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to run, err:', err);
    process.exit(1);
  });
