import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success } from 'specshell';
import { createApp } from './createApp';
import { UnauthorizedError, NotFoundError } from '@binaris/spice-koa-server/interfaces';

const test = anyTest as TestInterface<Context>;

addFake(test);

const makeApp = createApp(true, 'template application');

const anything = td.matchers.anything();

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

test('unlockApp unlock a locked application by appName', async (t) => {
  const app = makeApp();
  td.when(t.context.lycanFake.getAppByName(anything, app.name)).thenResolve(app);
  const result = await t.context.shell.run(`${t.context.run} unlock ${app.name} `, 'utf-8');
  t.snapshot(result);
  td.verify(t.context.lycanFake.unlockApp(anything, app.id));
});

test('appName not in project dir', async (t) => {
  const result = await t.context.shell.run(`cd .. && ${t.context.run} unlock`, 'utf-8');
  t.snapshot(result);
});

test('missing application', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'fluffy-test')).thenReject(new NotFoundError('not found'));
  const result = await t.context.shell.run(`cd .. && ${t.context.run} unlock fluffy-test`, 'utf-8');
  t.snapshot(result);
});

test('permission error', async (t) => {
  td.when(t.context.lycanFake.unlockApp(anything, 'fluffy-samaritan')).thenReject(new UnauthorizedError('no auth'));
  const result = await t.context.shell.run(`${t.context.run} unlock`, 'utf-8');
  t.snapshot(result);
});

test('too many args', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} unlock arg extra-arg`, 'utf-8');
  t.snapshot(result);
});
