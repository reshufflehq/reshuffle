// tslint:disable:no-console
import path from 'path';
import { promisify } from 'util';
import { mkdtemp } from 'fs';
import { tmpdir } from 'os';
import { spawn as spawnChild } from 'child_process';
import { copy, remove } from 'fs-extra';
import { spawn, waitOnChild } from '@binaris/utils-subprocess';

const shell = process.platform === 'win32';

async function readUntilPattern(stream: NodeJS.ReadableStream, pattern: RegExp) {
  let out = '';
  for await (const l of stream) {
    out += l.toString();
    if (pattern.test(out)) {
      break;
    }
  }
  throw new Error(`Expected pattern not found: ${pattern}`);
}

async function main() {
  const testDir = await promisify(mkdtemp)(path.resolve(tmpdir(), 'test'));
  // const testDir = '/private/var/folders/dk/75x6sg2x0mb0g4l4tr96v6xr0000gn/T/test8Sc1f5';
  console.log('Created test dir', testDir);
  const appName = 'my-app';
  const appDir = path.resolve(testDir, appName);
  try {
    await spawn('npx', ['create-react-app', appName], {
      cwd: testDir,
      stdio: 'inherit',
      shell,
    });
    await spawn('npx', [path.resolve(__dirname, '../../shiftjs-react-app/index.js')], {
      cwd: appDir,
      stdio: 'inherit',
      shell,
    });
    await copy(path.resolve(__dirname, '..', 'app'), appDir);

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
      console.log('Killing app', reactApp.pid);
      // TODO: support windows
      process.kill(-reactApp.pid, 'SIGINT');
      await waitOnChild(reactApp);
    }
  } finally {
    await remove(testDir);
  }
}

main().catch((err) => {
  console.error('Failed to run', err);
  process.exit(1);
});
