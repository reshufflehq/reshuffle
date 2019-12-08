import { CLIError } from '@oclif/errors';
import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class Lock extends Command {
  public static description = 'lock an application';
  public static examples = [
    `$ ${Command.cliBinName} lock 'locking my application example'`,
    `$ ${Command.cliBinName} lock -s 'my-unlock-app' 'application is a template' `,
  ];

public static flags = {
  ...Command.flags,
  appName: flags.string({
    char: 's',
    description: 'Application to lock (defaults to working directory\'s deployed application)',
  }),
};

  public static args = [
    {
      name: 'lockReason',
      required: true,
      description: 'Reason to lock an application',
    },
  ];

  public static strict = true;

  public async run() {
    const { flags: { appName }, args: { lockReason } } = this.parse(Lock);
    await this.authenticate();
    const { applicationId } = await this.getAppId(appName);
    try {
       await this.lycanClient.lockApp(applicationId, lockReason);
    } catch (error) {
      throw new CLIError(error.message);
    }
    this.log(`Application: ${applicationId} successfully locked with the reason ${lockReason}`);
  }
}
