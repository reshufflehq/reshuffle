import columnify from 'columnify';

import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class List extends Command {
  public static description = 'list applications';
  public static examples = [
    `$ ${Command.cliBinName} list`,
  ];

  public static args = [];

  public static strict = true;

  public static flags = {
    ...Command.flags,
    format: flags.string({
      char: 'f',
      description: 'Format output',
      default: 'table',
      options: ['table', 'json'],
    }),
  };

  public async run() {
    const { format } = this.parse(List).flags;
    await this.authenticate();
    const apps = await this.lycanClient.listApps();
    const mappedApps = apps.map(({ name, updatedAt, environments }) => ({
      name,
      updatedAt: updatedAt.toISOString(),
      URL: `https://${environments[0].domains[0].name}`,
    }));

    switch (format) {
      case 'table':
        if (apps.length === 0) {
          this.log('You do not have any apps yet.');
          return;
        }
        this.log(columnify(mappedApps, {
          columns: ['name', 'updatedAt', 'URL'],
          config: {
            name: {
              headingTransform: () => 'APPLICATION',
              minWidth: 25,
            },
            updatedAt: {
              headingTransform: () => 'LAST UPDATED',
              minWidth: 25,
            },
          },
        }));
        return;
      case 'json':
        this.log(JSON.stringify(mappedApps));
        return;
      default:
        throw new Error(`Invalid output format requested: ${format}`);
    }
  }
}
