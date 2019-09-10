import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import * as R from 'ramda';

const test = anyTest as TestInterface<Context>;

addFake(test);

const process = R.evolve({ out: (x: Buffer) => x.toString(), err: (x: Buffer) => x.toString() });

const anything = td.matchers.anything();

test('browse lists templates on dumb terminal', async (t) => {
  td.when(t.context.lycanFake.whoami(anything)).thenResolve(
    {
      id: 'fluffy',
      fullName: 'You N. Icorn',
      email: 'horn@hoof.invalid',
      externalAccounts: [],
    });

  const result = process(await t.context.shell.run(`${t.context.run} whoami`));
  t.snapshot(result);
});
