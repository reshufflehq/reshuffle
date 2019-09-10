import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import * as R from 'ramda';
import { success } from 'specshell';

const test = anyTest as TestInterface<Context>;

addFake(test);

const process = R.evolve({ out: (x: Buffer) => x.toString(), err: (x: Buffer) => x.toString() });

const anything = td.matchers.anything();

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});

const fakeLogs = [
  { source: 'foo', msg: 'main engine fire\n', isErr: false, time: new Date('1977-09-05T12:55:55') },
  { source: 'bar', msg: 'liftoff\n', isErr: true, time: new Date('1977-09-05T12:56:00'),
    invocation: { durUs: 10000, reqid: 'launch-voyager-1' } },
  { source: 'space', msg: 'Amalthea flyby\n', isErr: false, time: new Date('1979-03-05T06:54:00') },
  { source: 'space', msg: 'Jupiter closest approach\n', isErr: false, time: new Date('1979-03-05T12:05:26') },
];

// test.skip('no logs for incorrect app id', () => 1);

test('logs', async (t) => {
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default', anything))
    .thenResolve({ records: fakeLogs });

  const result = process(await t.context.shell.run(`${t.context.run} logs`));
  t.snapshot(result);
});

test('logs limit', async (t) => {
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { limit: 2, since: anything, follow: false }))
  // Could return any number of records, give 3 rather than the
  // expected 2.  Verify logs prints required fields.
    .thenResolve({ records: fakeLogs.slice(0, 3) });

  const result = process(await t.context.shell.run(`${t.context.run} logs --limit 2`));
  t.snapshot(result);
});

test('logs since absolute time', async (t) => {
  const sinceStr = '1978-01-01T01:02:03';
  const since = new Date(sinceStr);
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { since, limit: anything, follow: false }))
    .thenResolve( { records: fakeLogs.filter(({ time }) => time > since) });
  const result = process(await t.context.shell.run(`${t.context.run} logs --since ${sinceStr}`));
  t.snapshot(result);
});

test('logs paginate', async (t) => {
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { since: anything, limit: anything, follow: false }))
    .thenResolve({ records: fakeLogs.slice(0, 2), nextToken: 'one' });
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { since: anything, limit: anything, follow: false, nextToken: 'one', }))
    .thenResolve({ records: fakeLogs.slice(2, 3), nextToken: 'two' });
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { since: anything, limit: anything, follow: false, nextToken: 'two', }))
    .thenResolve({ records: fakeLogs.slice(3) });

  const result = process(await t.context.shell.run(`${t.context.run} logs`));
  t.snapshot(result);
});
