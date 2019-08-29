import Command from '../utils/command';

import columnify from 'columnify';

export default class List extends Command {
  public static description = 'list applications';
  public static examples = [
    `$ ${Command.cliBinName} list`,
  ];

  public static args = [];

  public static strict = true;

  public async run() {
    this.parse(List);
    const apps = await this.lycanClient.listApps();
    if (apps.length === 0) {
      this.log('You do not have any apps yet.');
      return;
    }
    // TODO: Get URL from lycan
    this.log(columnify(apps.map(({ accountId, id, name, updatedAt }) => ({
      name, updatedAt: updatedAt.toISOString(), URL: `https://${accountId}-${id}.shiftjx.com`,
    })), {
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
  }
}
