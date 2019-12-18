/* eslint-disable no-console */
import path from 'path';
import { mkdtemp, readFile, writeFile } from 'mz/fs';
import { tmpdir } from 'os';
import { spawn as spawnChild, ChildProcess } from 'child_process';
import { copy, remove, pathExists } from 'fs-extra';
import { Tail } from 'tail';
import sleep from 'sleep-promise';
import { spawn, waitOnChild } from '@reshuffle/utils-subprocess';
import got from 'got';
import { strict as assert } from 'assert';

const shell = process.platform === 'win32';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CLI = path.resolve(ROOT_DIR, 'cli', 'bin', 'run');
const REGISTRY_URL = 'http://localhost:4873/';

function log(msg: string, ...args: any[]) {
  console.log(`${new Date().toISOString()} ${msg}`, ...args);
}

async function readAll(stream: NodeJS.ReadableStream) {
  const out: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (buf) => {
      out.push(buf);
    });
    stream.on('end', () => resolve(Buffer.concat(out).toString()));
    stream.on('error', (err) => reject(err));
  });
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
    await untilExists(logPath, 60);
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
        setTimeout(async () => {
          let contents;
          try {
            contents = await readFile(logPath, 'utf8');
          } catch (e) {
            contents = `Error ${e}`;
          }
          reject(new Error(`Timed out waiting for verdaccio - ${contents}`));
        }, 60 * 1000);
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
    const line = npmrc.split('\n').find((l) => l.includes(':_authToken='));
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

async function withRegistry<T>(testDir: string, fn: () => Promise<T>) {
  log('Starting local registry');
  const registry = await Registry.create(testDir);
  try {
    await registry.ready();
    log('Creating local registry token');
    const token = await registry.createToken();
    log('Publishing to local registry');
    await publishToLocalRegistry(token);
    return await fn();
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
    await spawn('npx', ['create-react-app', '--use-npm', this.appName], {
      cwd: this.testDir,
      stdio: 'inherit',
      shell,
    });
    log('Reshuffling');
    await spawn('node', [path.resolve(ROOT_DIR, 'react-app', 'dist', 'reactApp.js')], {
      cwd: this.appDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_REGISTRY: REGISTRY_URL,
      },
    });
    await copy(path.resolve(__dirname, '..', 'app'), this.appDir);
    log('Installing react-router-dom');
    // We intentionally do not put dependencies in package.json because it's created by CRA
    await spawn('npm', ['install', 'react-router-dom', '@reshuffle/storage', '@reshuffle/react-storage'], {
      cwd: this.appDir,
      stdio: 'inherit',
      shell,
      env: {
        ...process.env,
        NPM_CONFIG_REGISTRY: REGISTRY_URL,
      },
    });
    log('Adding local-server script to package.json');
    const packageJsonPath = path.resolve(this.appDir, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['local-server'] = 'reshuffle-local-server';
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', { encoding: 'utf8' });
  }

  public async run(runMode: string, fn: (url: string) => Promise<void>) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const run = runMode === 'remote' ? this.runRemote : this.runLocal;
    await run.call(this, fn);
    if (runMode !== 'remote') {
      await this.runLocalServerTests();
    }
  }

  public async runLocal(fn: (url: string) => Promise<void>) {
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
      await fn('http://localhost:3000');
    } finally {
      log('Killing app');
      await killGroup(reactApp);
    }
  }

  public async runLocalServerTests() {
    log('Starting local-server');
    const localServer = spawnChild('npm', ['run', 'local-server'], {
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
      await readUntilPattern(localServer.stdout, /reshuffle-local-server is listening on port 3000/);
      const response = await got('http://localhost:3000/express/hello');
      assert.equal(response.body, 'hello from express');
    } finally {
      log('Killing local-server');
      await killGroup(localServer);
    }
  }

  private async getDeployedApps(): Promise<Array<{ name: string, updatedAt: string, URL: string }>> {
    const child = spawnChild('node', [CLI, 'list', '--format', 'json'], {
      cwd: this.appDir,
      stdio: 'pipe',
    });
    const [out] = await Promise.all([
      readAll(child.stdout),
      waitOnChild(child),
    ]);
    return JSON.parse(out);
  }

  public async runRemote(fn: (url: string) => Promise<void>) {
    log('Cleanup leftovers');
    const leftoverApps = await this.getDeployedApps();
    for (const app of leftoverApps) {
      log('Cleanup leftover', app.name);
      await spawn('node', [CLI, 'destroy', app.name]);
    }
    log('Deploying app');
    await spawn('node', [CLI, 'deploy'], {
      cwd: this.appDir,
      stdio: 'inherit',
    });
    try {
      const apps = await this.getDeployedApps();
      if (apps.length !== 1) {
        throw new Error(`Expected exactly 1 app to be deployed, got: ${apps.length}`);
      }
      await fn(apps[0].URL);
    } finally {
      try {
        log('------ App logs ------');
        // Logs are available with a delay.
        // Wait a bit to increase chances of getting all logs.
        await sleep(3000);
        await spawn('node', [CLI, 'logs'], { cwd: this.appDir, stdio: 'inherit' });
        log('----------------------');
      } catch (e) {
        log('failed to fetch logs', e);
      }
      await spawn('node', [CLI, 'destroy'], {
        cwd: this.appDir,
        stdio: 'inherit',
      });
      log('Destroying app');
    }
  }
}

function createApp(testDir: string): Promise<App> {
  return withRegistry(testDir, async () => {
    const app = new App(testDir, 'my-app');
    await app.create();
    return app;
  });
}

async function main() {
  const testDir = await mkdtemp(path.resolve(tmpdir(), 'test'), { encoding: 'utf8' });
  log('Created test dir', testDir);
  try {
    const app = await createApp(testDir);
    await app.run(process.env.APP_E2E_RUN_MODE || 'local', async (baseUrl) => {
      log('Running tests');
      await spawn('npx', ['cypress@3.4.1', 'run'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        shell,
        env: {
          ...process.env,
          // eslint-disable-next-line @typescript-eslint/camelcase
          CYPRESS_baseUrl: baseUrl,
        },
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
