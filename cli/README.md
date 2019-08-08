shift-cli
=========

ShiftJS CLI Tool

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/shift-cli.svg)](https://npmjs.org/package/shift-cli)
[![Downloads/week](https://img.shields.io/npm/dw/shift-cli.svg)](https://npmjs.org/package/shift-cli)
[![License](https://img.shields.io/npm/l/shift-cli.svg)](https://github.com/binaris/shiftjs/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g shift-cli
$ shift-cli COMMAND
running command...
$ shift-cli (-v|--version|version)
shift-cli/0.0.0 darwin-x64 node-v10.16.0
$ shift-cli --help [COMMAND]
USAGE
  $ shift-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`shift-cli deploy`](#shift-cli-deploy)
* [`shift-cli help [COMMAND]`](#shift-cli-help-command)
* [`shift-cli logs`](#shift-cli-logs)

## `shift-cli deploy`

deploy your ShiftJS project to its associated domain

```
USAGE
  $ shift-cli deploy

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ shift-cli deploy
```

_See code: [src/commands/deploy.ts](https://github.com/binaris/shiftjs/blob/v0.0.0/cli/src/commands/deploy.ts)_

## `shift-cli help [COMMAND]`

display help for shift-cli

```
USAGE
  $ shift-cli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.0/src/commands/help.ts)_

## `shift-cli logs`

Show logs

```
USAGE
  $ shift-cli logs

OPTIONS
  -f, --follow       Follow log output like "tail -f".
  -h, --help         show CLI help
  -s, --since=since  [default: 1m] Output logs since the given ISO 8601 timestamp or time period.
  --limit=limit

EXAMPLES
  // retrieve all logs
  $ shift-cli logs

  // tail all logs
  $ shift-cli logs --follow

  // ISO
  $ shift-cli logs --since 2018-03-09T22:12:21.861Z

  // offset format
  $ shift-cli logs --since 3d
  $ shift-cli logs --since 13hours
  $ shift-cli logs --since 9s

  // show all logs from 2 minutes ago and follow in real time
  $ shift-cli logs --since 2m --follow
```

_See code: [src/commands/logs.ts](https://github.com/binaris/shiftjs/blob/v0.0.0/cli/src/commands/logs.ts)_
<!-- commandsstop -->
