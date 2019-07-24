import { promisify } from 'util';
import { tmpdir } from 'os';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from 'fs';
import path from 'path';
import {
  chdir,
  cwd,
} from 'process';
import rmrf from 'rmfr';
import {
  setupProxy,
  installPackages,
  ignoreShift,
} from '../steps';

const promiseAccess = promisify(access);
const promiseWriteFile = promisify(writeFile);
const promiseReadFile = promisify(readFile);

const origDir = cwd();
let testDir: string;

beforeEach(async () => {
  testDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-script-'), 'utf8');
  chdir(testDir);
});

async function fakeApp() {
  await promisify(mkdir)('src');
}

afterEach(async () => {
  chdir(origDir);
  await rmrf(testDir);
});

test('setup proxy fails without src dir', async () => {
  expect(() => {
    setupProxy();
  }).toThrow("ENOENT: no such file or directory, open 'src/setupProxy.js'");
});

test('setup proxy works with src dir', async () => {
  await fakeApp();
  const msg = await setupProxy();
  expect(msg).toBe('Created src/setupProxy.js, please commit this file');
  process.chdir('src');
  await promiseAccess('setupProxy.js');
});

test('setup proxy fails if called twice', async () => {
  await fakeApp();
  await setupProxy();
  expect(() => {
    setupProxy();
  }).toThrow("EEXIST: file already exists, open 'src/setupProxy.js'");
});

test('install creates node_modules', async () => {
  await fakeApp();
  const msg = await installPackages();
  expect(msg).toBe(`Packages installed
Modified package.json, please commit this file`);
  await promiseAccess('node_modules');
}, 60000);

test('ignore does not create .gitignore', async () => {
  await fakeApp();
  const msg = await ignoreShift();
  expect(msg).toBe('Did not update .gitignore');
  await expect(promiseAccess('.gitignore')).rejects.toThrow();
});

test('ignore edits .gitignore', async () => {
  await fakeApp();
  const testCases = [
    {
      initial: '',
      expected: `.shift*
`,
    },
    {
      initial: 'foo',
      expected: `foo
.shift*`,
    },
    {
      initial: '.shift*',
      expected: '.shift*',
    },
    {
      initial: `foo
.shift*`,
      expected: `foo
.shift*`,
    },
    {
      initial: `.shift*
bar`,
      expected: `.shift*
bar`,
    },
    {
      initial: `foo
.shift*
bar`,
      expected: `foo
.shift*
bar`,
    },
    {
      initial: '.shifter',
      expected: `.shifter
.shift*`,
    },
  ];
  for (const { initial, expected } of testCases) {
    await promiseWriteFile('.gitignore', initial);
    const msg = await ignoreShift();
    const data = await promiseReadFile('.gitignore');
    expect(data.toString()).toBe(expected);
    if (initial === expected) {
      expect(msg).toBe('Did not need to update .gitignore');
    } else {
      expect(msg).toBe('Updated .gitignore, please commit this file');
    }
  }
});
