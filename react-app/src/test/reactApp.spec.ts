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
  sanityCheck,
  setupProxy,
  installPackages,
  ignoreReshuffle,
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
  await promiseWriteFile('./package.json', JSON.stringify({ scripts: { eject: 'react-scripts eject' } }));
}

afterEach(async () => {
  chdir(origDir);
  await rmrf(testDir);
});

test('sanity check fails without package json', async () => {
  expect(() => {
    sanityCheck();
  }).toThrow("ENOENT: no such file or directory, open './package.json'");
});

test('sanity check fails without unparsable package json', async () => {
  await promiseWriteFile('./package.json', 'xxx');
  expect(() => {
    sanityCheck();
  }).toThrow('Cannot parse package.json');
});

test('sanity check fails without scripts', async () => {
  await promiseWriteFile('./package.json', JSON.stringify({ foo: { eject: 'xxx' } }));
  expect(() => {
    sanityCheck();
  }).toThrow('Can not run outside of a create-react-app or an ejected project');
});

test('sanity check fails without eject', async () => {
  await promiseWriteFile('./package.json', JSON.stringify({ scripts: { noteject: 'xxx' } }));
  expect(() => {
    sanityCheck();
  }).toThrow('Can not run outside of a create-react-app or an ejected project');
});

test('sanity check fails without proper eject', async () => {
  await promiseWriteFile('./package.json', JSON.stringify({ scripts: { eject: 'xxx' } }));
  expect(() => {
    sanityCheck();
  }).toThrow('Can not run outside of a create-react-app or an ejected project');
});

test('setup proxy fails without src dir', async () => {
  expect(() => {
    setupProxy();
  }).toThrow("ENOENT: no such file or directory, open 'src/setupProxy.js'");
});

test('setup proxy works with src dir', async () => {
  await fakeApp();
  const msg = setupProxy();
  expect(msg).toBe('Created src/setupProxy.js, please commit this file');
  process.chdir('src');
  await promiseAccess('setupProxy.js');
});

test('setup proxy fails if different proxy exists', async () => {
  await fakeApp();
  await promiseWriteFile('src/setupProxy.js', 'xxx');
  expect(() => {
    setupProxy();
  }).toThrow("EEXIST: file already exists, open 'src/setupProxy.js'");
});

test('setup proxy works if called twice', async () => {
  await fakeApp();
  setupProxy();
  const msg = setupProxy();
  expect(msg).toBe('Left src/setupProxy.js as is');
});

test('install creates node_modules', async () => {
  await fakeApp();
  const msg = await installPackages();
  expect(msg).toBe(`Packages installed
Modified package.json, please commit this file`);
  await promiseAccess('node_modules');
}, 180000);

test('ignore does not create .gitignore', async () => {
  await fakeApp();
  const msg = ignoreReshuffle();
  expect(msg).toBe('Did not update .gitignore');
  await expect(promiseAccess('.gitignore')).rejects.toThrow();
});

test('ignore edits .gitignore', async () => {
  await fakeApp();
  const testCases = [
    {
      initial: '',
      expected: `# The following line was added by Reshuffle
.reshuffle*`,
    },
    {
      initial: 'foo',
      expected: `foo
# The following line was added by Reshuffle
.reshuffle*`,
    },
    {
      initial: '.reshuffle*',
      expected: '.reshuffle*',
    },
    {
      initial: '.reshuffle* ',
      expected: '.reshuffle* ',
    },
    {
      initial: '.reshuffle*  ',
      expected: '.reshuffle*  ',
    },
    {
      initial: 'x.reshuffle*',
      expected: `x.reshuffle*
# The following line was added by Reshuffle
.reshuffle*`,
    },
    {
      initial: '.reshuffle*x',
      expected: `.reshuffle*x
# The following line was added by Reshuffle
.reshuffle*`,
    },
    {
      initial: '.reshuffle*\\ ',
      // tslint:disable-next-line:no-trailing-whitespace
      expected: `.reshuffle*\\ 
# The following line was added by Reshuffle
.reshuffle*`,
    },
    {
      initial: `foo
.reshuffle*`,
      expected: `foo
.reshuffle*`,
    },
    {
      initial: `.reshuffle*
bar`,
      expected: `.reshuffle*
bar`,
    },
    {
      initial: `foo
.reshuffle*
bar`,
      expected: `foo
.reshuffle*
bar`,
    },
    {
      initial: '.reshuffle*\t',
      expected: `.reshuffle*\t
# The following line was added by Reshuffle
.reshuffle*`,
    },
  ];
  for (const { initial, expected } of testCases) {
    await promiseWriteFile('.gitignore', initial);
    const msg = ignoreReshuffle();
    const data = await promiseReadFile('.gitignore');
    expect(data.toString()).toBe(expected);
    if (initial === expected) {
      expect(msg).toBe('Did not need to update .gitignore');
    } else {
      expect(msg).toBe('Updated .gitignore, please commit this file');
    }
  }
});
