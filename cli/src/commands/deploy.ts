import path, { resolve as pathResolve } from 'path';
import { createReadStream, stat, mkdtemp, exists } from 'mz/fs';
import { mkdirp, remove, copy } from 'fs-extra';
import { tmpdir } from 'os';
import tar from 'tar';
import terminalLink from 'terminal-link';
import fetch from 'node-fetch';
import shellEcape from 'any-shell-escape';
import prompts from 'prompts';
import { spawn } from '@reshuffle/utils-subprocess';
import { Application } from '@binaris/spice-node-client/interfaces';
import Command from '../utils/command';
import { getDependencies } from '../utils/getdeps';
import flags from '../utils/cli-flags';
import {
  getPrimaryDomain,
  getProjectRootDir,
  getProjectEnv,
  getEnvFromArgs,
  findProjectByDirectory,
  mergeEnvArrays,
} from '../utils/helpers';

// TODO: test flows:
// * no project associated and 1 app deployed prompts user to select app and exits when user aborts (Ctrl-C)
// * deploy fails with meaningful message during (code upload|build|node_modules copy)
// TODO: add --env flag to bypass app association mechanism

function escapeWin32(filePath: string) {
  return process.platform === 'win32' ? shellEcape(filePath) : filePath;
}

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
      description: 'Do not show interactive prompt, deploy a new app even if current directory has an associated app',
    }),
  };

  public static strict = true;

  public async build(projectDir: string): Promise<string> {
    this.log('Building and bundling your app! This may take a few moments, please wait');
    const stagingDir = await mkdtemp(pathResolve(tmpdir(), 'reshuffle-bundle-'), { encoding: 'utf8' });
    try {
      await spawn('npm', ['run', 'build'], {
        cwd: projectDir,
        stdio: 'inherit',
        // in win32 npm.cmd must be run in shell - no escaping needed since all
        // arguments are constant strings
        shell: process.platform === 'win32',
      });
      this.log('Preparing backend...');
      const deps = await getDependencies(projectDir);
      for (const [dep, props] of deps) {
        const source = pathResolve(projectDir, 'node_modules', dep);
        const target = pathResolve(stagingDir, 'node_modules', dep);
        if (await exists(source)) {
          await mkdirp(target);
          await copy(source, target);
        } else if (!props.optional) {
          /* eslint-disable-next-line no-console */
          console.error(`WARN: Cannot find dependency ${dep} in node_modules, skipping upload`);
        }
      }

      const filesToExclude = new Set(['node_modules', 'backend', 'src'].map((f) => pathResolve(projectDir, f)));
      await copy(projectDir, stagingDir, {
        filter(src) {
          return !filesToExclude.has(src) &&
            !(path.dirname(src) === projectDir && path.basename(src).startsWith('.'));
        },
      });

      await spawn(escapeWin32(pathResolve(projectDir, 'node_modules', '.bin', 'babel')), [
        '--no-babelrc',
        '--config-file',
        pathResolve(__dirname, '../../lib/utils/babelBackendConfig.js'),
        '--source-maps',
        'true',
        '--plugins',
        ['@babel/plugin-transform-modules-commonjs',
          'module:@reshuffle/code-transform'].join(','),
        'backend/',
        '-d',
        escapeWin32(pathResolve(stagingDir, 'backend')),
      ], {
        cwd: projectDir,
        stdio: 'inherit',
        // in win32 babel.cmd must be run in shell - no escaping needed since
        // the only dynamic variable used is stagingDir (result of tmpdir())
        shell: process.platform === 'win32',
      });

      await copy(pathResolve(projectDir, 'backend'), pathResolve(stagingDir, 'backend'), {
        filter(src) {
          return path.extname(src) !== '.js';
        },
      });

      return stagingDir;

    } catch (err) {
      await remove(stagingDir);
      throw err;
    }
  }

  public async createTarball(stagingDir: string): Promise<string> {
    const tarPath = pathResolve(stagingDir, 'bundle.tgz');
    await tar.create({
      gzip: true,
      file: tarPath,
      cwd: stagingDir,
      filter: (filePath) => filePath !== './bundle.tgz',
    }, ['.']);
    return tarPath;
  }

  public async uploadCode(tarPath: string) {
    const { size: contentLength } = await stat(tarPath);
    const stream = createReadStream(tarPath);
    this.log('Uploading your assets! This may take a few moments, please wait');
    const res = await fetch(`${this.apiEndpoint}/code`, {
      method: 'POST',
      headers: {
        ...this.apiHeaders,
        'Content-Type': 'application/gzip',
        'Content-Length': `${contentLength}`,
      },
      body: stream,
    });
    if (res.status !== 200) {
      // TODO: check error if response is not a json and display a nice error message
      const { message } = await res.json();
      this.error(message);
    }
    const { digest } = await res.json();
    return digest;
  }

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
    if (givenAppName && forceNewApp) {
      this.error(`--app-name and --new-app flags are incompatible. For renaming use: $ ${Command.cliBinName} rename`);
    }
    this.startStage('authenticate');
    await this.authenticate();

    this.startStage('get project');
    const projectDir = await getProjectRootDir();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const envVars = mergeEnvArrays(await getProjectEnv(), getEnvFromArgs(givenEnv || []));
    const projects = this.conf.get('projects') || [];

    // TODO: select target before this block
    this.startStage('build');
    const stagingDir = await this.build(projectDir);
    let digest: string;
    try {
      this.startStage('zip');
      const tarPath = await this.createTarball(stagingDir);
      this.startStage('upload');
      digest = await this.uploadCode(tarPath);
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
        this.startStage('register app on local');

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
