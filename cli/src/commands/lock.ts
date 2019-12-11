import { CLIError } from '@oclif/errors';
import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class Lock extends Command {
  public static description = 'lock an application';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} lock --reason template-application`,
    `$ ${Command.cliBinName} lock -r template`,
    `$ ${Command.cliBinName} lock --reason application-is-a-template great-unicorn-42`,
    `$ ${Command.cliBinName} lock -r application-is-a-template great-fluffy-142`,
  ];

  public static flags = {
    ...Command.flags,
    reason: flags.string({
      char: 'r',
      required: true,
      description: 'Reason to lock an application. Can pass either --reason or -r',
    }),
  };

  public static args = [
    {
      name: 'appName',
      required: false,
      description: 'Application to lock (defaults to working directory\'s deployed application)',
    },
  ];

  public static strict = true;

  public async run() {
    const { flags: { reason }, args: { appName } } = this.parse(Lock);
    await this.authenticate();
    const applicationId = await this.getAppIdByNameOrWorkingDirectory(appName);
    try {
      await this.lycanClient.lockApp(applicationId, reason);
    } catch (error) {
      throw new CLIError(error.message);
    }
    this.log(`Application: ${appName} successfully locked with, ${reason}`);
  }
}
