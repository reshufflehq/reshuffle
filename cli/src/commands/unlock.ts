import { CLIError } from '@oclif/errors';
import Command from '../utils/command';

export default class Unlock extends Command {
  public static description = 'unlock an application';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} unlock`,
    `$ ${Command.cliBinName} unlock great-unicorn-42 `,
  ];

  public static args = [
    {
      name: 'appName',
      required: false,
      description: 'Application to unlock (defaults to working directory\'s deployed application)',
    },
  ];

  public static strict = true;

  public async run() {
    const { appName } = this.parse(Unlock).args;
    await this.authenticate();
    const applicationId  = await this.getAppIdByNameOrWorkingDirectory(appName);
    try {
       await this.lycanClient.unlockApp(applicationId);
    } catch (error) {
      throw new CLIError(error.message);
    }
    this.log(`Application: ${appName} successfully unlocked`);
  }
}
