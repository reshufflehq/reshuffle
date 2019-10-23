import { CLIError } from '@oclif/errors';
import Command from '../utils/command';
import flags from '../utils/cli-flags';
import {
  getProjectRootDir,
  Project,
} from '../utils/helpers';

export default class Rename extends Command {
  public static description = 'rename an application';
  public static examples = [
    `$ ${Command.cliBinName} rename great-rhinoceros-42 surpassing-lemur-17`,
  ];

  public static flags = {
    ...Command.flags,
    sourceName: flags.string({
      char: 's',
      description: 'Application to rename (defaults to working directory\'s deployed application)',
    }),
  };

  public static args = [
    {
      name: 'targetName',
      required: true,
      description: 'New name to give the application',
    },
  ];

  public static strict = true;

  public async run() {
    const { flags: { sourceName }, args: { targetName } } = this.parse(Rename);
    await this.authenticate();
    const projects = this.conf.get('projects') as Project[] | undefined || [];

    let appIdOrName = sourceName;
    if (!appIdOrName) {
      let projectDir: string;
      try {
        projectDir = await getProjectRootDir();
      } catch (err) {
        throw new CLIError(`"sourceName" flag not provided and ${err.message}`);
      }
      const project = projects.find(({ directory }) => directory === projectDir);
      if (project === undefined) {
        throw new CLIError('"sourceName" flag not provided and could not locate project settings');
      }
      appIdOrName = project.applicationId;
    }

    try {
      if (sourceName) {
        await this.lycanClient.renameAppByName(appIdOrName, targetName);
      } else {
        try {
          await this.lycanClient.renameApp(appIdOrName, targetName);
        } catch (err) {
          if (err.name === 'NotFoundError') {
            throw new CLIError('The current application is not deployed');
          }
          throw err;
        }
      }
    } catch (error) {
      // TODO: add verbose logging of the entire error
      throw new CLIError(error.message);
    }
    this.log('Application successfully renamed!');
  }
}
