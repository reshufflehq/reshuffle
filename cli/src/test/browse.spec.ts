import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import * as R from 'ramda';

const test = anyTest as TestInterface<Context>;

addFake(test);

const process = R.evolve({ out: (x: Buffer) => x.toString(), err: (x: Buffer) => x.toString() });

const anything = td.matchers.anything();

test('browse lists templates on dumb terminal', async (t) => {
  td.when(t.context.lycanFake.listTemplates(anything)).thenResolve([
    {
      id: 'uniqueorn', name: 'unicorn', previewImageUrl: 'http://cdn.invalid/u.jpg',
      githubUrl: 'http://gh.invalid/uni.git',
    }, {
      id: 'two', name: 'toucan', previewImageUrl: 'http://cdn.invalid/t.jpg',
      githubUrl: 'http://gh.invalid/two.git',
    },
  ]);

  const result = process(await t.context.shell.run('./bin/run browse'));
  t.snapshot(result);
});
