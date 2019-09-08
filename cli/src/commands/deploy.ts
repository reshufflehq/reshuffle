import path, { resolve as pathResolve } from 'path';
import { createReadStream, stat } from 'mz/fs';
import { mkdirp, remove, copy } from 'fs-extra';
import { tmpdir } from 'os';
import tar from 'tar';
import terminalLink from 'terminal-link';
import fetch from 'node-fetch';
import { spawn } from '@binaris/utils-subprocess';
import { LycanClient } from '@binaris/spice-node-client';
import { Application } from '@binaris/spice-node-client/interfaces';
import Command from '../utils/command';
import { getDependencies } from '../utils/getdeps';
import {
  getProjectPackageJson,
  getProjectRootDir,
  getProjectEnv,
  Project,
} from '../utils/helpers';

export default class Deploy extends Command {
  public static description = 'deploy your ShiftJS project to its associated domain';

  public static examples = [
    `$ ${Command.cliBinName} deploy`,
  ];

  public static args = [];

  public static strict = true;

  public async build(projectDir: string): Promise<string> {
    this.log('Building and bundling your app! This may take a few moments, please wait');
    const stagingDir = pathResolve(tmpdir(), 'shift-bundle-');
    await mkdirp(stagingDir);
    try {
      await spawn('npm', ['run', 'build'], {
        cwd: projectDir,
        stdio: 'inherit',
        // in win32 npm.cmd must be run in shell - no escaping needed since all
        // arguments are constant strings
        shell: process.platform === 'win32',
      });
      await mkdirp(stagingDir);
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

      await spawn(pathResolve(projectDir, 'node_modules', '.bin', 'babel'), [
        '--plugins',
        '@babel/plugin-transform-modules-commonjs',
        // TODO: include shift-backend plugin?
        'backend/',
        '-d',
        pathResolve(stagingDir, 'backend'),
      ], {
        cwd: projectDir,
        stdio: 'inherit',
        // in win32 babel.cmd must be run in shell - no escaping needed since
        // the only dynamic variable used is stagingDir (result of tmpdir())
        shell: process.platform === 'win32',
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

  public async run() {
    this.parse(Deploy);
    await this.authenticate();
    const projectDir = await getProjectRootDir();
    const envVars = await getProjectEnv();
    const projects = this.conf.get('projects') as Project[] | undefined || [];

    const pkg = await getProjectPackageJson();
    if (typeof pkg.name !== 'string' || !pkg.name) {
      return this.error('Expected package.json to include a valid package name');
    }
    const stagingDir = await this.build(projectDir);
    let digest: string;
    try {
      const tarPath = await this.createTarball(stagingDir);
      digest = await this.uploadCode(tarPath);
    } finally {
      await remove(stagingDir);
    }

    const client = new LycanClient(this.apiEndpoint, { headers: this.apiHeaders });
    const env = 'default'; // hardcoded for now
    const project = projects.find(({ directory }) => directory === projectDir);
    let application: Application;
    this.log('Preparing your cloud deployment! This may take a few moments, please wait');
    if (!project) {
      // TODO: there might already be an application with this name and will result in an error, handle this
      application = await client.deployInitial(env, pkg.name, digest, envVars);
      projects.push({
        directory: projectDir,
        applicationId: application.id,
        defaultEnv: application.environments[0].name,
      });
      this.conf.set('projects', projects);
    } else {
      const { applicationId, defaultEnv } = project;
      application = await client.deploy(applicationId, defaultEnv, digest, envVars);
    }
    const domain = application.environments[0].domains[0].name;
    const link = terminalLink(domain, `https://${domain}`, { fallback: (_, url) => url });
    this.log(`Project successfully deployed! Your project is now available at: ${link}`);
  }
}
