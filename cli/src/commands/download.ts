import { CLIError } from '@oclif/errors';
import * as path from 'path';
import * as tar from 'tar';
import * as request from 'request';
import { spawn } from '@binaris/utils-subprocess';
import Command from '../utils/command';
import { Project } from '../utils/helpers';
import flags from '../utils/cli-flags';

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
    const applications = await this.lycanClient.listApps();
    const application = applications.find((app) => app.id === applicationId);
    if (!application) {
      if (verbose) {
        this.log('All applications:', applications);
      }
      return this.error('Could not find application');
    }
    const { sourceUrl } = application;
    if (typeof sourceUrl !== 'string') {
      if (verbose) {
        this.log('application:', application);
      }
      return this.error('Application source is unknown');
    }
    const projectBaseName = `${path.basename(sourceUrl)}-master`;
    const projectDir = path.resolve(projectBaseName);
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
    const compressedSourceUrl = `${sourceUrl}/archive/master.tar.gz`;
    // this.log(compressedSourceUrl);
    const targetDir = '.';
    const extract = tar.extract({ cwd: targetDir });
    const verboseLog = (type: string, err: Error) => {
      if (verbose) {
        this.log(`${type}:  ${err.message}`);
      }
    };
    await new Promise<void>((resolve, reject) => {
      request.get(compressedSourceUrl)
        .on('error', (err) => {
          verboseLog('request', err);
          reject(new CLIError(`Failed fetching ${compressedSourceUrl}`));
        })
        .on('response', (res) => {
          const statusCode = res.statusCode;
          if (statusNotOk(statusCode)) {
            reject(new CLIError(`Bad status code ${statusCode} when fetching ${compressedSourceUrl}`));
          }
        })
        .pipe(extract)
        .on('error', (err) => {
          verboseLog('extract', err);
          reject(new CLIError('Failed extracting application'));
        })
        .on('finish', () => {
          resolve();
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
