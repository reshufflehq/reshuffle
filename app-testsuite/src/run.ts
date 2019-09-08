// tslint:disable:no-console
import path from 'path';
import { mkdtemp, readFile } from 'mz/fs';
import { tmpdir } from 'os';
import { spawn as spawnChild, ChildProcess } from 'child_process';
import { copy, remove, pathExists } from 'fs-extra';
import { Tail } from 'tail';
import sleep from 'sleep-promise';
import { spawn, waitOnChild } from '@binaris/utils-subprocess';

const shell = process.platform === 'win32';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const REGISTRY_URL = 'http://localhost:4873/';

function log(...args: any[]) {
  console.log(new Date(), ...args);
}

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
    await sleep(sleepDuration);
  }
  throw new Error(`Path ${file} does not exist`);
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
          const parsed = JSON.parse(line);
          if (parsed.addr) {
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
    const npmrc = await readFile(path.resolve(this.workdir, '.npmrc'), 'utf8');
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
  });
}

async function withRegistry(testDir: string, fn: () => Promise<void>) {
  log('Starting local registry');
  const registry = await Registry.create(testDir);
  try {
    await registry.ready();
    log('Creating local registry token');
    const token = await registry.createToken();
    log('Publishing to local registry');
    await publishToLocalRegistry(token);
    await fn();
  } finally {
    await registry.destroy();
  }
}

class App {
  public readonly appDir: string;

  constructor(
    public readonly testDir: string,
    public readonly appName: string
  ) {
    this.appDir = path.resolve(testDir, appName);
  }

  public async create() {
    log('Creating react app');
    await spawn('npx', ['create-react-app', this.appName], {
      cwd: this.testDir,
      stdio: 'inherit',
      shell,
    });
    log('Reshuffling');
    await spawn('node', [path.resolve(ROOT_DIR, 'shiftjs-react-app', 'index.js')], {
      cwd: this.appDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_REGISTRY: REGISTRY_URL,
      },
    });
    await copy(path.resolve(__dirname, '..', 'app'), this.appDir);
  }

  public async runLocal(fn: () => Promise<void>) {
    log('Starting app');
    const reactApp = spawnChild('npm', ['start'], {
      cwd: this.appDir,
      stdio: 'pipe',
      detached: true,
      shell,
      env: {
        ...process.env,
        BROWSER: 'none',
      },
    });
    try {
      await readUntilPattern(reactApp.stdout, new RegExp(`You can now view ${this.appName} in the browser`));
      await fn();
    } finally {
      log('Killing app');
      await killGroup(reactApp);
    }
  }
}

async function main() {
  const testDir = await mkdtemp(path.resolve(tmpdir(), 'test'), { encoding: 'utf8' });
  log('Created test dir', testDir);
  try {
    await withRegistry(testDir, async () => {
      const app = new App(testDir, 'my-app');
      await app.create();
      await app.runLocal(async () => {
        log('Running tests');
        await spawn('npx', ['cypress', 'run'], {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit',
          shell,
          env: {
            ...process.env,
            CYPRESS_baseUrl: 'http://localhost:3000',
          },
        });
      });
    });
  } finally {
    await remove(testDir);
  }
}

main()
  .then(() => {
    log('Great success!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to run, err:', err);
    process.exit(1);
  });
