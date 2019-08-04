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
shift-cli/0.0.0 darwin-x64 node-v10.15.0
$ shift-cli --help [COMMAND]
USAGE
  $ shift-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`shift-cli hello [FILE]`](#shift-hello-file)
* [`shift-cli help [COMMAND]`](#shift-help-command)

## `shift-cli hello [FILE]`

describe the command here

```
USAGE
  $ shift-cli hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ shift-cli hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/binaris/shiftjs/blob/v0.0.0/src/commands/hello.ts)_

## `shift-cli help [COMMAND]`

display help for shift

```
USAGE
  $ shift-cli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.0/src/commands/help.ts)_
<!-- commandsstop -->
