import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { createApp } from './utils';
import { success } from 'specshell';

const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test('env --list returns all specified environment variables in order', async (t) => {
  td.when(t.context.lycanFake.getEnv(anything, 'fluffy-samaritan', null)).thenResolve({
    variables: [
      // Unsorted, so we can verify the client does sort.
      { variable: 'FRUIT', source: 'user:edit', value: 'zebra' },
      { variable: 'ANIMAL', source: 'user:edit', value: 'apple' },
    ],
  });

  const result = await t.context.shell.run(`${t.context.run} env --list`, 'utf-8');
  t.snapshot(result);
});

test('env [whatever] --app-name accesses a different app', async (t) => {
  const otherApp = createApp({ name: 'not-this-app', id: 'random-id' });
  td.when(t.context.lycanFake.getAppByName(anything, otherApp.name)).thenResolve(otherApp);
  td.when(t.context.lycanFake.getEnv(anything, otherApp.id, null)).thenResolve({ variables: [
    { variable: 'FRUIT', source: 'user:edit', value: 'bat' },
  ] });

  const result = await t.context.shell.run(`${t.context.run} env --list --name=${otherApp.name}`, 'utf-8');
  t.snapshot(result);
});

test('env --get gets', async (t) => {
  td.when(t.context.lycanFake.getEnv(anything, 'fluffy-samaritan', ['FRUIT', 'ANIMAL'])).thenResolve({
    variables: [
      // Unsorted, in order that client requested them.
      { variable: 'FRUIT', source: 'user:edit', value: 'zebra' },
      { variable: 'ANIMAL', source: 'user:edit', value: 'apple' },
    ],
  });

  const result = await t.context.shell.run(`${t.context.run} env --get FRUIT --get ANIMAL`, 'utf-8');
  t.snapshot(result);
});

test('env --set sets', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} env --set FRUIT=zebra -s ANIMAL=apple`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.setEnv(
    anything, 'fluffy-samaritan', false,
    {
      variables: [
        { variable: 'FRUIT', source: 'user:edit', value: 'zebra' },
        { variable: 'ANIMAL', source: 'user:edit', value: 'apple' },
      ],
    },
    []));
});

test('env --set sets empty', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} env --set nothing=`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.setEnv(
    anything, 'fluffy-samaritan', false,
    {
      variables: [
        { variable: 'nothing', source: 'user:edit', value: '' },
      ],
    },
    []));
});

test('env --set-from-env sets from env', async (t) => {
  const setupResult = await t.context.shell.run('export FRUIT=zebra ANIMAL=apple', 'utf-8');
  t.assert(success(setupResult));
  const result = await t.context.shell.run(`${t.context.run} env --set-from-env FRUIT ANIMAL`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.setEnv(
    anything, 'fluffy-samaritan', false,
    {
      variables: [
        { variable: 'FRUIT', source: 'user:edit', value: 'zebra' },
        { variable: 'ANIMAL', source: 'user:edit', value: 'apple' },
      ],
    },
    []));
});

test('env --set-from-env fails to set from missing env', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} env --set-from-env FRUIT`, 'utf-8');
  t.snapshot(result);
  // Must not call setEnv.
  td.verify(
    t.context.lycanFake.setEnv(anything, anything, anything, anything, anything),
    { times: 0, ignoreExtraArgs: true }
  );
});
