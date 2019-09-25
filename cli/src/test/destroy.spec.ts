import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success } from 'specshell';
import { readFile } from 'mz/fs';
import { NotFoundError, UnauthorizedError } from '@binaris/spice-node-client/interfaces';
import { safeLoad } from 'js-yaml';

const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

test('no args in project dir', async (t) => {
  td.when(t.context.lycanFake.destroyApp(anything, 'fluffy-samaritan')).thenResolve(null);
  const result = await t.context.shell.run(`${t.context.run} destroy`, 'utf-8');
  t.snapshot(result);
  const config = await readFile(t.context.configPath, 'utf-8');
  t.snapshot(config);
});

test('no args not in project dir', async (t) => {
  const result = await t.context.shell.run(`cd .. && ${t.context.run} destroy`, 'utf-8');
  t.snapshot(result);
  const config = await readFile(t.context.configPath, 'utf-8');
  t.is(config, t.context.projectConfig);
});

test('too many args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} destroy arg extra-arg`, 'utf-8');
  t.snapshot(result);
});

test('missing application', async (t) => {
  td.when(t.context.lycanFake.destroyAppByName(anything, 'no-such-app-id')).thenReject(new NotFoundError('not found'));

  const result = await t.context.shell.run(`${t.context.run} destroy no-such-app-id`, 'utf-8');
  t.snapshot(result);
});

test('permission error', async (t) => {
  td.when(t.context.lycanFake.destroyAppByName(anything, 'no-perm')).thenReject(new UnauthorizedError('no auth'));

  const result = await t.context.shell.run(`${t.context.run} destroy no-perm`, 'utf-8');
  t.snapshot(result);
});

test('application not in projects', async (t) => {
  td.when(t.context.lycanFake.destroyAppByName(anything, 'app-without-project')).thenResolve(null);

  const result = await t.context.shell.run(`${t.context.run} destroy app-without-project`, 'utf-8');
  t.snapshot(result);
  const config = await readFile(t.context.configPath, 'utf-8');
  t.deepEqual(safeLoad(config), safeLoad(t.context.projectConfig));
});
