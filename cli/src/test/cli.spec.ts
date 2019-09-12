import test from 'ava';
import { Shell, success } from 'specshell';
import * as path from 'path';
import { tmpdir } from 'os';
import { mkdtemp } from 'mz/fs';
import { writeJson, remove } from 'fs-extra';
import { env as processEnv } from 'process';

test('cli with no args shows help', async (t) => {
  const shell = new Shell();
  // TODO(ariels): Find this directory!
  const { out, err, ...status } = await shell.run('./bin/run', 'utf-8');

  t.true(success(status));
  t.assert(err === '');
  t.assert(out.match(/^Reshuffle CLI Tool.*?VERSION.*?USAGE.*?COMMANDS/s));
});

test('cli with no args and cli help and cli --help give same output', async (t) => {
  const shell = new Shell();
  const noArgs = await shell.run('./bin/run', 'utf-8');
  const helpCmd = await shell.run('./bin/run help', 'utf-8');
  const helpArg = await shell.run('./bin/run --help', 'utf-8');
  t.deepEqual(noArgs, helpCmd);
  t.deepEqual(noArgs, helpArg);
});

// TODO(arik): Do we want to enforce a particular order?
test('cli with no args lists all commands', async (t) => {
  const expectedCommands = new Set([
    'browse', 'claim', 'deploy', 'destroy', 'download', 'help', 'list', 'logs', 'try', 'whoami',
  ]);
  const shell = new Shell();
  const { out } = await shell.run('./bin/run', 'utf-8');

  const commandsMatch = out.match(/^Reshuffle CLI Tool.*?VERSION.*?USAGE.*?COMMANDS.*?\n(.*)/s);
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

test('cli does not login if provided config with authToken', async (t) => {
  const confDir = await mkdtemp(path.join(tmpdir(), 'spec-config-'), { encoding: 'utf8' });
  try {
    const confPath = path.join(confDir, 'conf.yml');
    await writeJson(confPath, { accessToken: 'test' });
    const shell = new Shell(undefined, { env: { ...processEnv, RESHUFFLE_CONFIG: confPath } });
    const { out, err, ...status } = await shell.run('./bin/run login --no-refetch', 'utf-8');
    t.true(success(status));
    t.is(err, '');
    t.is(out, '');
  } finally {
    await remove(confDir);
  }
});
