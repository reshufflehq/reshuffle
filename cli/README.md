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
shift-cli/0.2.0 darwin-x64 node-v10.15.3
$ shift-cli --help [COMMAND]
USAGE
  $ shift-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`shift-cli browse`](#shift-cli-browse)
* [`shift-cli claim TOKEN`](#shift-cli-claim-token)
* [`shift-cli deploy`](#shift-cli-deploy)
* [`shift-cli destroy`](#shift-cli-destroy)
* [`shift-cli help [COMMAND]`](#shift-cli-help-command)
* [`shift-cli list`](#shift-cli-list)
* [`shift-cli logs`](#shift-cli-logs)
* [`shift-cli try ID`](#shift-cli-try-id)
* [`shift-cli whoami`](#shift-cli-whoami)

## `shift-cli browse`

list templates

```
USAGE
  $ shift-cli browse

OPTIONS
  -h, --help       show CLI help
<<<<<<< HEAD
  --config=config  [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config  [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

EXAMPLE
  $ shift-cli browse
```

_See code: [src/commands/browse.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/browse.ts)_

## `shift-cli claim TOKEN`

claim an application

```
USAGE
  $ shift-cli claim TOKEN

ARGUMENTS
  TOKEN  claim token

OPTIONS
  -h, --help       show CLI help
<<<<<<< HEAD
  --config=config  [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config  [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

EXAMPLE
  $ shift-cli claim OiJIUzI1NiIsIn
```

_See code: [src/commands/claim.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/claim.ts)_

## `shift-cli deploy`

deploy your ShiftJS project to its associated domain

```
USAGE
  $ shift-cli deploy

OPTIONS
  -h, --help       show CLI help
<<<<<<< HEAD
  --config=config  [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config  [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

EXAMPLE
  $ shift-cli deploy
```

_See code: [src/commands/deploy.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/deploy.ts)_

## `shift-cli destroy`

destroy an application

```
USAGE
  $ shift-cli destroy

OPTIONS
  -h, --help       show CLI help
<<<<<<< HEAD
  --config=config  [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config  [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes
  --id=id          Application id (defaults to working directory's deployed application ID)

EXAMPLE
  $ shift-cli destroy 123
```

_See code: [src/commands/destroy.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/destroy.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.1/src/commands/help.ts)_

## `shift-cli list`

list applications

```
USAGE
  $ shift-cli list

OPTIONS
  -f, --format=table|json  [default: table] Format output
  -h, --help               show CLI help
<<<<<<< HEAD
  --config=config          [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config          [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

EXAMPLE
  $ shift-cli list
```

_See code: [src/commands/list.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/list.ts)_

## `shift-cli logs`

show logs

```
USAGE
  $ shift-cli logs

OPTIONS
  -f, --follow       Follow log output like "tail -f".
  -h, --help         show CLI help
  -l, --limit=limit  [default: 500] Limit number of entries shown (cannot exceed 1000).
  -s, --since=since  [default: 1m] Output logs since the given ISO 8601 timestamp or time period.
<<<<<<< HEAD
  --config=config    [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config    [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

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

_See code: [src/commands/logs.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/logs.ts)_

## `shift-cli try ID`

try a template

```
USAGE
  $ shift-cli try ID

ARGUMENTS
  ID  template id

OPTIONS
  -h, --help       show CLI help
<<<<<<< HEAD
  --config=config  [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config  [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

EXAMPLE
  $ shift-cli try 123
```

_See code: [src/commands/try.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/try.ts)_

## `shift-cli whoami`

print your identity

```
USAGE
  $ shift-cli whoami

OPTIONS
  -h, --help       show CLI help
<<<<<<< HEAD
  --config=config  [default: /Users/bergundy/.shiftjs/shiftjs.config.yml]
=======
  --config=config  [default: /Users/ariels/.shiftjs/shiftjs.config.yml]
>>>>>>> rush and oclif file changes

EXAMPLE
  $ shift-cli whoami
```

_See code: [src/commands/whoami.ts](https://github.com/binaris/shiftjs/blob/shift-cli_v0.2.0/cli/src/commands/whoami.ts)_
<!-- commandsstop -->
