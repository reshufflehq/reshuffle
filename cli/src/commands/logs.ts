import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class Logs extends Command {
  public static description = 'Show logs';

  public static examples = [
`// retrieve all logs
$ ${Command.cliBinName} logs
`,
`// tail all logs
$ ${Command.cliBinName} logs --follow
`,
`// ISO
$ ${Command.cliBinName} logs --since 2018-03-09T22:12:21.861Z
`,
`// offset format
$ ${Command.cliBinName} logs --since 3d
$ ${Command.cliBinName} logs --since 13hours
$ ${Command.cliBinName} logs --since 9s
`,
`// show all logs from 2 minutes ago and follow in real time
$ ${Command.cliBinName} logs --since 2m --follow`,
];

  public static flags = {
    ...Command.flags,
    limit: flags.minMaxInt({
      char: 'l',
      description: 'Limit number of entries shown (cannot exceed 1000).',
      default: 500,
      min: 1,
      max: 1000,
    }),
    follow: flags.boolean({
      char: 'f',
      description: 'Follow log output like "tail -f".',
    }),
    since: flags.durationOrTimestamp({
      char: 's',
      description: 'Output logs since the given ISO 8601 timestamp or time period.',
      default: '1m',
    }),
  };

  public static args = [];

  public static strict = true;

  public async run() {

    const {flags: { since, follow, limit }} = this.parse(Logs);

    this.log('Logs', { since, follow, limit });

  }
}
