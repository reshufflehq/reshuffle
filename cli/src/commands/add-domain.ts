import { CLIError } from '@oclif/errors';
import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class AddDomain extends Command {
  public static description = 'add custom domain';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} add-domain example.com`,
  ];

  public static args = [
    {
      name: 'domain',
      required: true,
      description: 'Custom domain',
    },
  ];

  public static flags = {
    ...Command.flags,
    'app-name': flags.string({
      char: 'n',
      description: 'If provided add domain to app by name',
    }),
  };

  public static strict = true;

  public async run() {
    const { args: { domain }, flags: { 'app-name': givenAppName } } = this.parse(AddDomain);
    await this.authenticate();
    const applicationId = await this.getAppIdByNameOrWorkingDirectory(givenAppName);
    try {
      await this.lycanClient.addAppDomain(applicationId, 'default', domain);
    } catch (error) {
      // TODO: add verbose logging of the entire error
      throw new CLIError(error.message);
    }
    this.log('Custom domain successfully added!');
  }
}
