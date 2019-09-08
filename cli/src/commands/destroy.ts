import Command from '../utils/command';
import flags from '../utils/cli-flags';
import {
  getProjectRootDir,
  Project,
} from '../utils/helpers';

export default class Destroy extends Command {
  public static description = 'destroy an application';
  public static examples = [
    `$ ${Command.cliBinName} destroy 123`,
  ];

  public static args = [];

  public static flags = {
    ...Command.flags,
    id: flags.string({
      description: 'Application id (defaults to working directory\'s deployed application ID)',
    }),
  };

  public static strict = true;

  public async run() {
    const { id } = this.parse(Destroy).flags;
    await this.authenticate();
    const projects = this.conf.get('projects') as Project[] | undefined || [];

    let appId = id;
    if (!appId) {
      const projectDir = await getProjectRootDir();
      const project = projects.find(({ directory }) => directory === projectDir);
      if (project === undefined) {
        throw new Error('"id" argument not provided and could not locate project settings');
      }
      appId = project.applicationId;
    }

    await this.lycanClient.destroyApp(appId);
    this.log('Application successfully destroyed!');
  }
}
