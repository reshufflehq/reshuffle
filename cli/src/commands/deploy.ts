import path, { resolve as pathResolve } from 'path';
import { createReadStream, stat, mkdtemp } from 'mz/fs';
import { mkdirp, remove, copy } from 'fs-extra';
import { tmpdir } from 'os';
import tar from 'tar';
import terminalLink from 'terminal-link';
import fetch from 'node-fetch';
import shellEcape from 'any-shell-escape';
import prompts from 'prompts';
import { spawn } from '@binaris/utils-subprocess';
import { Application } from '@binaris/spice-node-client/interfaces';
import Command from '../utils/command';
import { getDependencies } from '../utils/getdeps';
import {
  getProjectRootDir,
  getProjectEnv,
  Project,
} from '../utils/helpers';

// TODO: test flows:
// * no project associated and no apps deployed deploys a new app and associates directory
// * no project associated and 1 app deployed
//   prompts user to select app and deploys to selected app and associates directory
// * no project associated and 1 app deployed
//   prompts user to select app and deploys new of new app selected and associates directory
// * no project associated and 1 app deployed prompts user to select app and exits when user aborts (Ctrl-C)
// * project associated deploys to associated app
// * project associated and deploy fails shows meaningful message
//
// TODO: add --app-id and --env flags to bypass app association mechanism

function escapeWin32(filePath: string) {
  return process.platform === 'win32' ? shellEcape(filePath) : filePath;
}

function makeAppLink(app: Application) {
  const domain = app.environments[0].domains[0].name;
  return terminalLink(domain, `https://${domain}`, { fallback: (_, url) => url });
}

export default class Deploy extends Command {
  public static description = 'deploy your Reshuffle project to its associated domain';

  public static examples = [
    `$ ${Command.cliBinName} deploy`,
  ];

  public static args = [];

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
      for (const dep of deps) {
        const source = pathResolve(projectDir, 'node_modules', dep);
        const target = pathResolve(stagingDir, 'node_modules', dep);
        await mkdirp(target);
        await copy(source, target);
      }

      const filesToExclude = new Set(['node_modules', 'backend', 'src'].map((f) => pathResolve(projectDir, f)));
      await copy(projectDir, stagingDir, {
        filter(src) {
          return !filesToExclude.has(src) &&
            !(path.dirname(src) === projectDir && path.basename(src).startsWith('.'));
        },
      });

      await spawn(escapeWin32(pathResolve(projectDir, 'node_modules', '.bin', 'babel')), [
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

  public async run() {
    this.parse(Deploy);
    await this.authenticate();

    const projectDir = await getProjectRootDir();
    const envVars = await getProjectEnv();
    const projects = this.conf.get('projects') as Project[] | undefined || [];

    const stagingDir = await this.build(projectDir);
    let digest: string;
    try {
      const tarPath = await this.createTarball(stagingDir);
      digest = await this.uploadCode(tarPath);
    } finally {
      await remove(stagingDir);
    }

    const env = 'default'; // hardcoded for now
    let project = projects.find(({ directory }) => directory === projectDir);

    let application: Application;
    if (!project) {
      const applicationId = await this.selectApplicationForProject();
      if (applicationId !== undefined) {
        project = {
          directory: projectDir,
          applicationId,
          defaultEnv: env,
        };
        projects.push(project);
        this.conf.set('projects', projects);
      }
    }

    this.log('Preparing your cloud deployment! This may take a few moments, please wait');
    if (!project) {
      application = await this.lycanClient.deployInitial(env, digest, envVars);
      projects.push({
        directory: projectDir,
        applicationId: application.id,
        defaultEnv: application.environments[0].name,
      });
      this.conf.set('projects', projects);
    } else {
      const { applicationId, defaultEnv } = project;
      application = await this.lycanClient.deploy(applicationId, defaultEnv, digest, envVars);
    }
    this.log(`Project successfully deployed! Your project is now available at: ${makeAppLink(application)}`);
  }
}
