import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Context, addFake } from './fake_lycan';
import { success } from 'specshell';

const test = anyTest as TestInterface<Context>;

addFake(test);

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

test('logs', async (t) => {
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default', anything))
    .thenResolve({ records: fakeLogs });

  const result = await t.context.shell.run(`${t.context.run} logs`, 'utf-8');
  t.snapshot(result);
});

test('logs limit', async (t) => {
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { limit: 2, since: anything, follow: false }))
  // Could return any number of records, give 3 rather than the
  // expected 2.  Verify logs prints required fields.
    .thenResolve({ records: fakeLogs.slice(0, 3) });

  const result = await t.context.shell.run(`${t.context.run} logs --limit 2`, 'utf-8');
  t.snapshot(result);
});

test('logs since absolute time', async (t) => {
  const sinceStr = '1978-01-01T01:02:03';
  const since = new Date(sinceStr);
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default',
                                      { since, limit: anything, follow: false }))
    .thenResolve( { records: fakeLogs.filter(({ time }) => time > since) });
  const result = await t.context.shell.run(`${t.context.run} logs --since ${sinceStr}`, 'utf-8');
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

  const result = await t.context.shell.run(`${t.context.run} logs`, 'utf-8');
  t.snapshot(result);
});

test('logs drops detailed logs without --all', async (t) => {
  const detailed1 = {
    source: 'spice', msg: 'Function plan_mariner_mission deployed (version digest: f11eb1e)\n',
    isErr: false, time: new Date('1972-07-01T00:00:00'),
  };
  const detailed2 = {
    source: 'voyager2', msg: 'Function invocation took 1.32819343e15 us\n', isErr: false,
    time: new Date('2019-09-22T12:36:12'),
  };
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default', anything))
    .thenResolve({ records: [ detailed1, ...fakeLogs, detailed2 ] });
  const result = await t.context.shell.run(`${t.context.run} logs`, 'utf-8');
  t.snapshot(result);
});

test('logs --all shows detailed logs', async (t) => {
  const detailed1 = {
    source: 'spice', msg: 'Function plan_mariner_mission deployed (version digest: f11eb1e)\n',
    isErr: false, time: new Date('1972-07-01T00:00:00'),
  };
  const detailed2 = {
    source: 'voyager2', msg: 'Function invocation took 1.32819343e15 us\n', isErr: false,
    time: new Date('2019-09-22T12:36:12'),
  };
  td.when(t.context.lycanFake.getLogs(anything, 'fluffysamaritan', 'default', anything))
    .thenResolve({ records: [ detailed1, ...fakeLogs, detailed2 ] });
  const result = await t.context.shell.run(`${t.context.run} logs --all`, 'utf-8');
  t.snapshot(result);
});

test('logs help', async (t) => {
  const result = await t.context.shell.run(`${t.context.run} help logs`, 'utf-8');
  t.snapshot(result);
});
