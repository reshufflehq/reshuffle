import { Command } from '@oclif/command';
import flags from '../utils/cli-flags';

export default class Logs extends Command {
  public static description = 'Show logs';

  public static examples = [
    '$ shift-cli logs',
    '$ shift-cli logs --follow',
    '$ shift-cli logs --since 2018-03-09T22:12:21.861Z',
    '$ shift-cli logs --since 3d',
    '$ shift-cli logs --since 13hours',
    '$ shift-cli logs --since 9s*',
    '$ shift-cli logs --since 2m --follow',
  ];

  public static flags = {
    help: flags.help({char: 'h'}),
    limit: flags.minMaxInt({
      char: 'l',
      description: 'Limit number of entries shown (cannot exceed 1000).',
      default: 500,
      min: 1,
      max: 1000,
    }),
    follow: flags.boolean({char: 'f', description: 'Follow log output like "tail -f".'}),
    since: flags.durationOrTimestamp({
      char: 's',
      description: 'Output logs since the given ISO 8601 timestamp or time period.',
      default: '1m',
    }),
  };

  public static args = [];

  public async run() {

    const {flags: { since, follow, limit }} = this.parse(Logs);

    this.log('Logs', { since, follow, limit });

  }
}
