import Command from '../utils/command';
import flags from '../utils/cli-flags';
import {
  getProjectRootDir,
  Project,
} from '../utils/helpers';
import ms = require('ms');

export default class Logs extends Command {
  public static description = 'show logs';

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
      default: false,
    }),
    since: flags.durationOrISO8601({
      char: 's',
      description: 'Output logs since the given ISO 8601 timestamp or time period.',
      default: '1m',
    }),
  };

  public static args = [];

  public static strict = true;

  public async run() {
    const { since, follow, limit } = this.parse(Logs).flags;
    await this.authenticate();

    const projectDir = await getProjectRootDir();
    const projects = this.conf.get('projects') as Project[] | undefined || [];
    const project = projects.find(({ directory }) => directory === projectDir);
    if (project === undefined) {
      return this.error(`No project deployments found, please run ${Command.cliBinName} deploy`);
    }
    let token: string | undefined;
    let currentLimit = limit!;
    do {
      // TODO: support other envs
      const sinceDate = typeof since === 'string' ? new Date(Date.now() - ms(since)) : since;
      const { records, nextToken } = await this.lycanClient.getLogs(
        project.applicationId.replace(/-/g, ''), project.defaultEnv,
        { follow, limit: currentLimit, since: sinceDate, nextToken: token });

      // TODO: fix EOL, multiple sources, formatting
      for (const record of records) {
        process.stdout.write(record.msg);
      }
      token = nextToken;
      currentLimit -= records.length;
    } while (token && currentLimit > 0);
  }
}
