import { CLIError } from '@oclif/errors';
import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class Lock extends Command {
  public static description = 'unlock an application';
  public static examples = [
    `$ ${Command.cliBinName} unlock`,
    `$ ${Command.cliBinName} lock -s 'my-unlock-app' `,
  ];

public static flags = {
  ...Command.flags,
  appName: flags.string({
    char: 's',
    description: 'Application to unlock (defaults to working directory\'s deployed application)',
  }),
};

  public static args = [];

  public static strict = true;

  public async run() {
    const { appName } = this.parse(Lock).flags;
    await this.authenticate();
    const { applicationId } = await this.getAppId(appName);
    try {
       await this.lycanClient.unlockApp(applicationId);
    } catch (error) {
      throw new CLIError(error.message);
    }
    this.log(`Application: ${applicationId} successfully unlocked`);
  }
}
