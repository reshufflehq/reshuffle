import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';

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
