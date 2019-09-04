import test from 'ava';
import { Shell, success } from 'specshell';
import * as R from 'ramda';

const process = R.evolve({ out: (x: Buffer) => x.toString(), err: (x: Buffer) => x.toString() });

test('cli with no args shows help', async (t) => {
  const shell = new Shell();
  // TODO(ariels): Find this directory!
  const { out, err, ...status } = process(await shell.run('./bin/run'));

  t.true(success(status));
  t.assert(err === '');
  t.assert(out.match(/^ShiftJS CLI Tool.*?VERSION.*?USAGE.*?COMMANDS/s));
});

test('cli with no args and cli help and cli --help give same output', async (t) => {
  const shell = new Shell();
  const noArgs = process(await shell.run('./bin/run'));
  const helpCmd = process(await shell.run('./bin/run help'));
  const helpArg = process(await shell.run('./bin/run --help'));
  t.deepEqual(noArgs, helpCmd);
  t.deepEqual(noArgs, helpArg);
});

// TODO(arik): Do we want to enforce a particular order?
test('cli with no args lists all commands', async (t) => {
  const expectedCommands = new Set([
    'browse', 'claim', 'deploy', 'destroy', 'help', 'list', 'logs', 'try', 'whoami',
  ]);
  const shell = new Shell();
  const { out } = process(await shell.run('./bin/run'));

  const commandsMatch = out.match(/^ShiftJS CLI Tool.*?VERSION.*?USAGE.*?COMMANDS.*?\n(.*)/s);
  t.truthy(commandsMatch, 'Match command titles');

  const commandRegExp = /^\s*(\w+)/mg;
  const commandsStr = commandsMatch![1];
  const commands = new Set<string>();
  let commandGroup: RegExpMatchArray | null;
  // tslint:disable-next-line no-conditional-assignment (MDN does it this way)
  while ((commandGroup = commandRegExp.exec(commandsStr)) != null) {
    commands.add(commandGroup[1]);
  }

  t.deepEqual(commands, expectedCommands);
});
