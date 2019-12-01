import { CLIError } from '@oclif/errors';
import Command from '../utils/command';

export default class RemoveDomain extends Command {
  public static description = 'remove custom domain';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} remove-domain subdomain.invalid`,
  ];

  public static args = [
    {
      name: 'domain',
      required: true,
      description: 'Custom domain',
    },
  ];

  public static strict = true;

  public async run() {
    const { domain } = this.parse(RemoveDomain).args;
    await this.authenticate();
    const applicationId = await this.getLocalAppId();
    try {
        await this.lycanClient.removeAppDomain(applicationId, 'default', domain);
    } catch (error) {
      // TODO: add verbose logging of the entire error
      throw new CLIError(error.message);
    }
    this.log('Custom domain successfully deleted!');
  }
}
