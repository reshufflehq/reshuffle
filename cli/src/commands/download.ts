import { CLIError } from '@oclif/errors';
import * as path from 'path';
import * as tar from 'tar';
import fetch from 'node-fetch';
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
    const { downloadUrl, downloadDir } = source;
    const projectDir = path.resolve(downloadDir);
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
    const targetDir = '.';
    const extract = tar.extract({ cwd: targetDir });
    const verboseLog = (type: string, err: Error) => {
      if (verbose) {
        this.log(`${type}:  ${err.message}`);
      }
    };
    await new Promise<void>((resolve, reject) => {
      fetch(downloadUrl)
        .then((res) =>  {
          const statusCode = res.status;
          if (statusNotOk(statusCode)) {
            reject(new CLIError(`Bad status code ${statusCode} when fetching ${downloadUrl}`));
          }
          res.body.pipe(extract)
            .on('error', (err) => {
              verboseLog('extract', err);
              reject(new CLIError('Failed extracting application'));
            })
            .on('finish', () => {
              resolve();
            });
        })
        .catch((err) => {
          verboseLog('download', err);
          reject(new CLIError(`Failed fetching ${downloadUrl}`));
        });
    });
    this.log('Installing packages...');
    await spawn('npm', ['install'], {
      cwd: projectDir,
      stdio: 'inherit',
      // in win32 npm.cmd must be run in shell - no escaping needed since all
      // arguments are constant strings
      shell: process.platform === 'win32',
    });
    this.log('Your application is ready!');
  }
}
