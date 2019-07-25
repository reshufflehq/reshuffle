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
  const msg = await setupProxy();
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
  await setupProxy();
  const msg = await setupProxy();
  expect(msg).toBe('Left src/setupProxy.js as is');
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
      expected: `# The following line was added by ShiftJS
.shift*`,
    },
    {
      initial: 'foo',
      expected: `foo
# The following line was added by ShiftJS
.shift*`,
    },
    {
      initial: '.shift*',
      expected: '.shift*',
    },
    {
      initial: '.shift* ',
      expected: '.shift* ',
    },
    {
      initial: '.shift*  ',
      expected: '.shift*  ',
    },
    {
      initial: 'x.shift*',
      expected: `x.shift*
# The following line was added by ShiftJS
.shift*`,
    },
    {
      initial: '.shift*x',
      expected: `.shift*x
# The following line was added by ShiftJS
.shift*`,
    },
    {
      initial: '.shift*\\ ',
      // tslint:disable-next-line:no-trailing-whitespace
      expected: `.shift*\\ 
# The following line was added by ShiftJS
.shift*`,
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
      initial: '.shift*\t',
      expected: `.shift*\t
# The following line was added by ShiftJS
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
