import { inspect } from 'util';
import { Application } from '@binaris/spice-node-client/interfaces';
import Command from '../utils/command';

export default class Info extends Command {
  public static description = 'get application info';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} info`,
    `$ ${Command.cliBinName} info neat-bison-17`,
  ];

  public static strict = true;

  public static args = [
    {
      name: 'name',
      required: false,
      description: 'Application name (defaults to working directory\'s deployed application name)',
    },
  ];

  protected async getAppDetails(appName?: string): Promise<Application> {
    if (appName) {
      try {
        return await this.lycanClient.getAppByName(appName);
      } catch (e) {
        return this.error(`Cannot find application ${appName}`);
      }
    } else {
      const applicationId = await this.getLocalAppId();
      try {
        return await this.lycanClient.getApp(applicationId);
      } catch (e) {
        return this.error('Cannot find local application');
      }
    }
  }
  public async run() {
    const { name: appName } = this.parse(Info).args;
    await this.authenticate();
    const application = await this.getAppDetails(appName);
    this.log(inspect(application, { depth: Infinity, compact: false }));
  }
}
