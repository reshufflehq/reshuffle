import columnify from 'columnify';
import Command from '../utils/command';
import flags from '../utils/cli-flags';
import { getPrimaryURL } from '../utils/helpers';

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

  protected getListTable(isLocked: boolean) {
    const listTable = {
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
    };
    if ( isLocked ) {
      listTable.columns.push('lockReason');
      const lockTmp = {
        lockReason: {
        headingTransform: () => 'LOCK REASON',
        minWidth: 25,
      },
    };
      return Object.assign(listTable, lockTmp);
    } else {
      return listTable;
    }
  }

  public async run() {
    const { format } = this.parse(List).flags;
    await this.authenticate();
    const apps = await this.lycanClient.listApps();
    const mappedApps = apps.map(({ name, updatedAt, environments, lockReason, locked }) => ({
      name,
      updatedAt: updatedAt.toISOString(),
      lockReason,
      URL: getPrimaryURL(environments[0]),
      locked,
    }));
    const isLocked = mappedApps.some((item) => item.locked);
    const returnTarget = this.getListTable(isLocked);

    switch (format) {
      case 'table':
        if (apps.length === 0) {
          this.log('You do not have any apps yet.');
          return;
        }
        this.log(columnify(mappedApps, returnTarget));
        return;
      case 'json':
        this.log(JSON.stringify(mappedApps));
        return;
    default:
      throw new Error(`Invalid output format requested: ${format}`);
    }
  }
}
