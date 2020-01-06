import { remove } from 'fs-extra';
import terminalLink from 'terminal-link';
import prompts from 'prompts';
import dedent from 'dedent';
import { spawn } from '@reshuffle/utils-subprocess';
import { Application } from '@binaris/spice-node-client/interfaces';
import Command from '../utils/command';
import flags from '../utils/cli-flags';
import { CLIError } from '@oclif/errors';
import {
  getPrimaryDomain,
  getProjectRootDir,
  getProjectEnv,
  getEnvFromArgs,
  findProjectByDirectory,
  mergeEnvArrays,
} from '../utils/helpers';
import { build, createTarball, uploadCode, MismatchedPackageAndPackageLockError } from '@reshuffle/build-utils';
// TODO: test flows:
// * no project associated and 1 app deployed prompts user to select app and exits when user aborts (Ctrl-C)
// * deploy fails with meaningful message during (code upload|build|node_modules copy)
// TODO: add --env flag to bypass app association mechanism

function makeAppLink(app: Application) {
  const domain = getPrimaryDomain(app.environments[0]);
  return terminalLink(domain, `https://${domain}`, { fallback: (_, url) => url });
}

export default class Deploy extends Command {
  public static description = 'deploy your Reshuffle project to its associated domain';

  public static examples = [
    `$ ${Command.cliBinName} deploy`,
  ];

  public static args = [];

  public static flags = {
    ...Command.flags,
    'app-name': flags.string({
      char: 'n',
      description: 'If provided replace given app',
    }),
    env: flags.string({
      char: 'e',
      multiple: true,
      description: 'Deprecated, prefer to use env command',
    }),
    'new-app': flags.boolean({
      default: false,
      description: dedent`Do not show interactive prompt
                          Deploy a new app even if current directory associated with app
                          Will create an app with a random name, for renaming use $ ${Command.cliBinName} rename`,
      exclusive: ['app-name'],
    }),
  };

  public static strict = true;

  public async selectApplicationForProject(): Promise<string | undefined> {
    const NEW_APPLICATION = '__new_application__';

    const apps = await this.lycanClient.listApps();
    if (apps.length === 0) {
      return undefined;
    }
    const { value } = await prompts({
      type: 'select',
      name: 'value',
      message: 'Select target',
      choices: apps.map((app) => ({
        // TODO: Decide on format
        title: `${app.name} at ${makeAppLink(app)} (last deployed: ${app.updatedAt.toISOString()})`,
        value: app.id,
      })).concat({
        title: 'Create new app',
        value: NEW_APPLICATION,
      }),
      initial: 0,
    });
    if (value === undefined) {
      this.error('No option selected');
    }
    return value === NEW_APPLICATION ? undefined : value;
  }

  public async findApplicationIdByName(appName: string): Promise<string> {
    const app = await this.lycanClient.getAppByName(appName);
    if (app === undefined) {
      this.error(`Could not find application named: "${appName}"`);
    }
    return app.id;
  }

  public async run() {
    const { flags: { 'app-name': givenAppName, env: givenEnv, 'new-app': forceNewApp } } = this.parse(Deploy);
    this.startStage('authenticate');
    await this.authenticate();

    this.startStage('get project');
    const projectDir = await getProjectRootDir();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const envVars = mergeEnvArrays(await getProjectEnv(), getEnvFromArgs(givenEnv || []));
    const projects = this.conf.get('projects') || [];

    // TODO: select target before this block
    this.startStage('build');

    let stagingDir: string;
    try {
      stagingDir = await build(projectDir, {
        skipNpmInstall: true,
        logger: this,
      });
    } catch (err) {
      if (err instanceof MismatchedPackageAndPackageLockError) {
        throw new CLIError(err);
      }
      throw err;
    }
    let digest: string;
    try {
      this.startStage('zip');
      const tarPath = await createTarball(stagingDir);
      this.startStage('upload');
      const uploadResp = await uploadCode(tarPath, `${this.apiEndpoint}/code`, this.apiHeaders, this);
      digest = uploadResp.digest;
    } finally {
      this.startStage('remove staging');
      await remove(stagingDir);
    }

    const updateAssociation = !givenAppName && !forceNewApp;
    let application: Application;
    const env = 'default'; // hardcoded for now
    const makeProject = (applicationId: string) => ({
      directory: projectDir,
      applicationId,
      defaultEnv: env,
    });

    this.startStage('choose deployment target');
    let project = forceNewApp ? undefined :
      givenAppName ? makeProject(await this.findApplicationIdByName(givenAppName)) :
      findProjectByDirectory(projects, projectDir);

    if (!project && updateAssociation) {
      const applicationId = await this.selectApplicationForProject();
      if (applicationId !== undefined) {
        project = makeProject(applicationId);
        projects.push(project);
        this.conf.set('projects', projects);
      }
    }

    this.startStage('deploy');
    this.log('Preparing your cloud deployment! This may take a few moments, please wait');
    if (!project) {
      application = await this.lycanClient.deployInitial(env, digest, envVars);
      if (updateAssociation) {
        projects.push({
          directory: projectDir,
          applicationId: application.id,
          defaultEnv: application.environments[0].name,
        });
        this.conf.set('projects', projects);
      }
    } else {
      const { applicationId, defaultEnv } = project;
      application = await this.lycanClient.deploy(applicationId, defaultEnv, digest, envVars);
    }
    this.log(`Project successfully deployed! Your project is now available at: ${makeAppLink(application)}`);
  }
}
