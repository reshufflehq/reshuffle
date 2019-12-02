import Command from '../utils/command';
import flags from '../utils/cli-flags';
import {
  getProjectRootDir,
  findProjectByDirectory,
} from '../utils/helpers';
import ms = require('ms');
import dedent from 'dedent';

const detailedLogsRegexps = [
  /^Function invocation took [\d.]+(e[-+]?\d+)? us$/m,
  /^Function \w+ deployed \(version digest: [0-9a-f]+\)$/m,
];

export default class Logs extends Command {
  public static description = 'show logs';

  public static examples = [
    dedent`// retrieve all logs (except "function invocation")
           $ ${Command.cliBinName} logs`,
    '',
    dedent`// retrieve all logs (including "function invocation")
           $ ${Command.cliBinName} logs --all`,
    '',
    dedent`// tail all logs
           $ ${Command.cliBinName} logs --follow`,
    '',
    dedent`// retrieve logs of specific app
           $ ${Command.cliBinName} logs cool-dragon-17`,
    '',
    dedent`// ISO
           $ ${Command.cliBinName} logs --since 2018-03-09T22:12:21.861Z`,
    '',
    dedent`// offset format
           $ ${Command.cliBinName} logs --since 3d
           $ ${Command.cliBinName} logs --since 13hours
           $ ${Command.cliBinName} logs --since 9s`,
    '',
    dedent`// show all logs from 2 minutes ago and follow in real time
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
      default: '30m',
    }),
    all: flags.boolean({
      char: 'a',
      description: 'Include detailed function deployment and invocation timings',
      default: false,
    }),
  };

  public static args = [
    {
      name: 'name',
      required: false,
      description: 'Application name (defaults to working directory\'s deployed application name)',
    },
  ];

  public static strict = true;

  protected async getAppDetails(appName?: string): Promise<{ applicationId: string, env: string }> {
    if (appName === undefined) {
      const projectDir = await getProjectRootDir();
      const projects = this.conf.get('projects');
      const project = findProjectByDirectory(projects, projectDir);
      if (project === undefined) {
        return this.error(`No project deployments found, please run ${Command.cliBinName} deploy`);
      }
      return {
        applicationId: project.applicationId,
        env: project.defaultEnv,
      };
    } else {
      try {
        const application = await this.lycanClient.getAppByName(appName);
        return {
          applicationId: application.id,
          env: application.environments[0].name,
        };
      } catch (e) {
        return this.error(`Cannot find application ${appName}`);
      }
    }
  }

  public async run() {
    const {
      flags: { since, follow, limit, all },
      args: { name: appName },
    } = this.parse(Logs);
    await this.authenticate();
    let printed = 0;

    const { applicationId, env } = await this.getAppDetails(appName);
    let token: string | undefined;
    let currentLimit = limit!;
    const sinceDate = typeof since === 'string' ? new Date(Date.now() - ms(since)) : since;
    do {
      // TODO: support other envs
      const { records, nextToken } = await this.lycanClient.getLogs(
        applicationId, env,
        { follow, limit: currentLimit, since: sinceDate, nextToken: token });

      // TODO: fix EOL, multiple sources, formatting
      for (const record of records) {
        if (all || detailedLogsRegexps.every((regexp) => !regexp.exec(record.msg))) {
          printed++;
          process.stdout.write(record.msg);
        }
      }
      token = nextToken;
      currentLimit -= records.length;
    } while (token && currentLimit > 0);
    if (!printed) {
      this.warn(`Could not find any logs since ${sinceDate.toISOString()}, ` +
        'try expanding your search with --since 1day');
    }
  }
}
