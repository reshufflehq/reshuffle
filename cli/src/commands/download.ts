import { CLIError } from '@oclif/errors';
import * as path from 'path';
import * as tar from 'tar';
import { rename, mkdtemp } from 'mz/fs';
import { remove } from 'fs-extra';
import { tmpdir } from 'os';
import fetch, { Response } from 'node-fetch';
import { spawn } from '@binaris/utils-subprocess';
import Command from '../utils/command';
import { Project } from '../utils/helpers';
import flags from '../utils/cli-flags';
import { Application } from '@binaris/spice-node-client/interfaces';

export function statusNotOk(code: number): boolean {
  return 200 > code || code >= 300;
}

export default class Download extends Command {
  public static description = 'download application';
  public static examples = [
    `$ ${Command.cliBinName} download 123456`,
  ];

  public static args = [
    {
      name: 'ID',
      required: true,
      description: 'application id',
    },
  ];

  public static flags = {
    ...Command.flags,
    verbose: flags.boolean({
      char: 'v',
      description: 'Be verbose',
      default: false,
    }),
  };

  public static strict = true;

  public async run() {
    const {
      args : { ID: applicationId },
      flags: { verbose },
    } = this.parse(Download);
    await this.authenticate();
    let application: Application | undefined;
    try {
      application = await this.lycanClient.getApp(applicationId);
    } catch (error) {
      // TODO: check different errors
    }
    if (!application) {
      return this.error('Could not find application');
    }
    const { source } = application;
    if (!source) {
      if (verbose) {
        this.log('application:', application);
      }
      return this.error('Application source is unknown');
    }
    const { downloadUrl, downloadDir, targetDir } = source;
    const projectDir = path.resolve(targetDir);
    const projects = this.conf.get('projects') as Project[] | undefined || [];
    const project = projects.find(({ directory }) => directory === projectDir);
    const env = 'default'; // hardcoded for now
    const newProject = {
        directory: projectDir,
        applicationId,
        defaultEnv: env,
    };
    if (project) {
      if (applicationId !== project.applicationId) {
        return this.error(`Directory ${projectDir} is already associated with a application ${project.applicationId}`);
      }
    } else {
      projects.push(newProject);
      this.conf.set('projects', projects);
    }
    this.log('Downloading application...');
    const stagingDir = await mkdtemp(path.resolve(tmpdir(), 'reshuffle-download-'), { encoding: 'utf8' });
    const extract = tar.extract({ cwd: stagingDir });
    const verboseLog = (type: string, err: Error) => {
      if (verbose) {
        this.log(`${type}:  ${err.message}`);
      }
    };
    try {
      let res: Response;
      try {
        res = await fetch(downloadUrl);
      } catch (err) {
        verboseLog('download', err);
        throw new CLIError(`Failed fetching ${downloadUrl}`);
      }
      const statusCode = res.status;
      if (statusNotOk(statusCode)) {
        throw new CLIError(`Bad status code ${statusCode} when fetching ${downloadUrl}`);
      }
      let first = true;
      await new Promise<void>((resolve, reject) => {
        res.body.pipe(extract)
          .on('error', (err) => {
            if (first) {
              verboseLog('extract', err);
              first = false;
            }
            reject(new CLIError('Failed extracting application'));
          })
          .on('close', () => {
            resolve();
          });
      });
      this.log('Installing packages...');
      const stagingDownloadDir = path.resolve(stagingDir, downloadDir);
      try {
        await spawn('npm', ['install'], {
          cwd: stagingDownloadDir,
          stdio: 'inherit',
          // in win32 npm.cmd must be run in shell - no escaping needed since all
          // arguments are constant strings
          shell: process.platform === 'win32',
        });
      } catch (err) {
        verboseLog('npm install', err);
        throw new CLIError('Failed installing packages');
      }
      try {
        await rename(stagingDownloadDir, targetDir);
      } catch (err) {
        verboseLog('rename', err);
        switch (err.code) {
          case 'ENOTEMPTY':
            throw new CLIError(`Directory ${targetDir} is not empty`);
          case 'ENOTDIR':
            throw new CLIError(`${targetDir} is not a directory`);
          default:
            throw err;
        }
      }
    } finally {
      try {
        await remove(stagingDir);
      } catch (e) {
        this.warn(`Failed removing staging directory: ${e.message}`);
      }
    }
    this.log(`Your application is ready in ${targetDir}`);
  }
}
