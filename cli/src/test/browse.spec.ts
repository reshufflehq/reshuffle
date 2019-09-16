import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';

const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test('browse lists templates on dumb terminal', async (t) => {
  td.when(t.context.lycanFake.listTemplates(anything)).thenResolve([
    {
      id: 'uniqueorn',
      name: 'unicorn',
      previewImageUrl: 'http://cdn.invalid/u.jpg',
      githubUrl: 'http://gh.invalid/uni.git',
      license: 'MIT',
      author: 'someone',
      description: 'something',
      similarTemplatesIds: [],
    }, {
      id: 'two',
      name: 'toucan',
      previewImageUrl: 'http://cdn.invalid/t.jpg',
      githubUrl: 'http://gh.invalid/two.git',
      license: 'MIT',
      author: 'someone',
      description: 'wow',
      similarTemplatesIds: [
        'uniqueorn',
      ],
    },
  ]);

  const result = await t.context.shell.run(`${t.context.run} browse`, 'utf-8');
  t.snapshot(result);
});
