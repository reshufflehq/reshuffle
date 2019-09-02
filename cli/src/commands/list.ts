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
    await this.authenticate();
    const apps = await this.lycanClient.listApps();
    if (apps.length === 0) {
      this.log('You do not have any apps yet.');
      return;
    }
    this.log(columnify(apps.map(({ name, updatedAt, environments }) => ({
      name, updatedAt: updatedAt.toISOString(), URL: `https://${environments[0].domains[0].name}`,
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
