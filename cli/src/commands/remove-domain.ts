import { CLIError } from '@oclif/errors';
import Command from '../utils/command';
import {
  getProjectRootDir,
  findProjectByDirectory,
} from '../utils/helpers';

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
    const projects = this.conf.get('projects') || [];
    const projectDir = await getProjectRootDir();
    const project = findProjectByDirectory(projects, projectDir);
    if (project === undefined) {
      throw new CLIError('Could not find local project settings');
    }
    const { applicationId } = project;
    try {
        await this.lycanClient.removeAppDomain(applicationId, 'default', domain);
    } catch (error) {
      // TODO: add verbose logging of the entire error
      throw new CLIError(error.message);
    }
    this.log('Custom domain successfully deleted!');
  }
}
