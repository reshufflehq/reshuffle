import { CLIError } from '@oclif/errors';
import Command from '../utils/command';

export default class Destroy extends Command {
  public static description = 'destroy an application';
  public static examples = [
    `$ ${Command.cliBinName} destroy 123`,
  ];

  public static args = [
    {
      name: 'id',
      required: false,
      description: 'Application id (defaults to working directory\'s deployed application ID)',
    },
  ];

  public static strict = true;

  public async run() {
    const { id: idFromArgs } = this.parse(Destroy).args;
    await this.authenticate();
    const projects = this.conf.get('projects') || [];

    const appId = idFromArgs || await this.getLocalAppId();

    try {
      if (idFromArgs) {
        await this.lycanClient.destroyAppByName(appId);
      } else {
        await this.lycanClient.destroyApp(appId);
      }
    } catch (error) {
      // TODO: add verbose logging of the entire error
      throw new CLIError(error.message);
    }
    if (!idFromArgs) {
      const projectsWithoutAppId = projects.filter(({ applicationId }) => applicationId !== appId);
      this.conf.set('projects', projectsWithoutAppId);
    }
    this.log('Application successfully destroyed!');
  }
}
