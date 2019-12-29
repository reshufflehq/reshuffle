import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { createApp } from './utils';

const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test('add-domain works on local dir', async (t) => {
  const app = createApp({});
  td.when(t.context.lycanFake.addAppDomain(anything, 'fluffy-samaritan', 'default', 'example.com')).thenResolve(app);

  const result = await t.context.shell.run(`${t.context.run} add-domain example.com`, 'utf-8');
  t.snapshot(result);
});

test('add-domain works with --app-name', async (t) => {
  const otherApp = createApp({ id: 'aaaa-0000' });
  td.when(t.context.lycanFake.getAppByName(anything, 'calm-salmon')).thenResolve(otherApp);
  td.when(t.context.lycanFake.addAppDomain(anything, 'aaaa-0000', 'default', 'example.com')).thenResolve(otherApp);

  const result = await t.context.shell.run(`${t.context.run} add-domain --app-name calm-salmon example.com`, 'utf-8');
  t.snapshot(result);
});

