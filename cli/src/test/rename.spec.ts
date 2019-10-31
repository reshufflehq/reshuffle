import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success } from 'specshell';
import { UnauthorizedError, NotFoundError } from '@binaris/spice-koa-server/interfaces';

const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

test('no sourceName in project dir', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} rename new-name`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.renameApp(anything, 'fluffy-samaritan', 'new-name'));
});

test('sourceName in project dir', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} rename -s fuzzy-dunlop new-name`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.renameAppByName(anything, 'fuzzy-dunlop', 'new-name'));
});

test('no sourceName not in project dir', async (t) => {
  const result = await t.context.shell.run(`cd .. && ${t.context.run} rename new-name`, 'utf-8');
  t.snapshot(result);
});

test('sourceName not in project dir', async (t) => {
  const result = await t.context.shell.run(`cd .. && ${t.context.run} rename -s fuzzy-dunlop new-name`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.renameAppByName(anything, 'fuzzy-dunlop', 'new-name'));
});

test('missing application', async (t) => {
  td.when(t.context.lycanFake.renameApp(anything, 'fluffy-samaritan', 'new-name')).thenReject(new NotFoundError('not found'));
  const result = await t.context.shell.run(`${t.context.run} rename new-name`, 'utf-8');
  t.snapshot(result);
});

test('permission error', async (t) => {
  td.when(t.context.lycanFake.renameApp(anything, 'fluffy-samaritan', 'no-perm')).thenReject(new UnauthorizedError('no auth'));

  const result = await t.context.shell.run(`${t.context.run} rename no-perm`, 'utf-8');
  t.snapshot(result);
});
