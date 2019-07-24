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
jest.spyOn(console, 'log').mockImplementation();
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
  }).toThrow();
});

test('setup proxy works with src dir', async () => {
  await fakeApp();
  await setupProxy();
  process.chdir('src');
  await promiseAccess('setupProxy.js');
});

test('setup proxy fails if called twice', async () => {
  await fakeApp();
  await setupProxy();
  expect(() => {
    setupProxy();
  }).toThrow();
});

test('install creates node_modules', async () => {
  await fakeApp();
  await installPackages();
  await promiseAccess('node_modules');
}, 60000);

test('ignore does not create .gitignore', async () => {
  await fakeApp();
  await ignoreShift();
  expect.assertions(1);
  await expect(promiseAccess('.gitignore')).rejects.toThrow();
});

test('ignore edits .gitignore', async () => {
  await fakeApp();
  const testCases = [
  { initial: '', expected: `.shift*
` },
  { initial: 'foo', expected: `foo
.shift*` },
  { initial: '.shift*', expected: '.shift*' },
  { initial: `foo
.shift*`, expected: `foo
.shift*` },
  { initial: `.shift*
bar`, expected: `.shift*
bar` },
  { initial: `foo
.shift*
bar`, expected: `foo
.shift*
bar` },
  { initial: '.shifter', expected: `.shifter
.shift*` },
  ];
  for (const { initial, expected } of testCases) {
    await promiseWriteFile('.gitignore', initial);
    await ignoreShift();
    const data = await promiseReadFile('.gitignore');
    expect(data.toString()).toBe(expected);
  }
});
