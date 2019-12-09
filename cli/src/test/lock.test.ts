import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { createApp } from './createApp';
import { success } from 'specshell';
import { UnauthorizedError, NotFoundError } from '@binaris/spice-koa-server/interfaces';

const test = anyTest as TestInterface<Context>;

addFake(test);

const makeApp = createApp(false);

const anything = td.matchers.anything();

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

test('lockApp lock an application by appName', async (t) => {
  const app = makeApp();
  td.when(t.context.lycanFake.getAppByName(anything, app.name)).thenResolve(app);
  const result = await t.context.shell.run(`${t.context.run} lock --reason lock-my-app ${app.name}`, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.lockApp(anything, app.id, 'lock-my-app'));
});

test('appName not in project dir', async (t) => {
  const result = await t.context.shell.run(`cd .. && ${t.context.run} lock --reason lock-reason`, 'utf-8');
  t.snapshot(result);
});

test('missing application', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'fluffy-test')).thenReject(new NotFoundError('not found'));
  const result = await t.context.shell.run(`cd .. && ${t.context.run} lock --reason lock-me fluffy-test`, 'utf-8');
  t.snapshot(result);
});

test('permission error', async (t) => {
  td.when(t.context.lycanFake.lockApp(anything, 'fluffy-samaritan', 'no-permission')).thenReject(new UnauthorizedError('no auth'));
  const result = await t.context.shell.run(`${t.context.run} lock --reason no-permission`, 'utf-8');
  t.snapshot(result);
});

test('too many args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} lock --reason arg extra-arg extra-extra-org`, 'utf-8');
  t.snapshot(result);
});
