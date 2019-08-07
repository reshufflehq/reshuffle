import { Command, flags } from '@oclif/command';
import ms from 'ms';
import { isInt } from 'validator';
import {error} from '@oclif/errors'

const MIN_LIMIT = 1;
const MAX_LIMIT = 1000;

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
    limit: flags.integer({
      char: 'l',
      description: 'Limit number of entries shown (cannot exceed 1000).',
      default: 500,
    }),
    follow: flags.boolean({char: 'f', description: 'Follow log output like "tail -f".'}),
    since: flags.string({
      char: 's',
      description: 'Output logs since the given ISO 8601 timestamp or time period.',
      default: '1m',
    }),
  };

  public static args = [];

  public async run() {

    const {flags: { since, follow, limit }} = this.parse(Logs);

    const sinceMs = ms(since)
    if (sinceMs === undefined) {
      error(`Expected a formatted duration format but received: ${since}`);
    }

    if(!isInt(limit.toString(), { max: MAX_LIMIT, min: MIN_LIMIT })) {
      error(`Expected a value between ${MIN_LIMIT} and ${MAX_LIMIT} but received: ${limit}`);
    }

    this.log('Logs', { since, sinceMs, follow, limit });

  }
}
