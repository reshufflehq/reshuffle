import { CLIError } from '@oclif/errors';
import Command from '../utils/command';

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

  public static strict = true;

  public async run() {
    const { domain } = this.parse(AddDomain).args;
    await this.authenticate();
    const applicationId = await this.getLocalAppId();
    try {
        await this.lycanClient.addAppDomain(applicationId, 'default', domain);
    } catch (error) {
      // TODO: add verbose logging of the entire error
      throw new CLIError(error.message);
    }
    this.log('Custom domain successfully added!');
  }
}
