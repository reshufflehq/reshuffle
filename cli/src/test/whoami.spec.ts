import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success } from 'specshell';

const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test('browse lists templates on dumb terminal', async (t) => {
  td.when(t.context.lycanFake.whoami(anything)).thenResolve(
    {
      id: 'fluffy',
      fullName: 'You N. Icorn',
      email: 'horn@hoof.invalid',
      externalAccounts: [],
    });

  const result = await t.context.shell.run(`${t.context.run} whoami`, 'utf-8');
  t.snapshot(result);
});

test('whoami (and other commands) receiving incomprehensible server reply complains nicely', async (t) => {
  td.when(t.context.lycanFake.whoami(anything)).thenResolve(
    ['cannot', 'understand', 'this', 'response']
  );

  const result = await t.context.shell.run(`${t.context.run} whoami`, 'utf-8');
  t.assert(!success(result));
  t.assert(result.err.match(/Failed to communicate with server: .*\./));
});
