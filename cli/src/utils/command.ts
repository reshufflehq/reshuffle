import { readFileSync } from 'fs';
import { resolve } from 'path';
import { URL } from 'url';
import { Command } from '@oclif/command';
import { CLIError } from '@oclif/errors';
import * as Parser from '@oclif/parser';
import ms from 'ms';
import Cli from 'cli-ux';
import terminalLink from 'terminal-link';
import { LycanClient, ValidationError } from '@binaris/spice-node-client';
import flags from './cli-flags';
import * as userConfig from './user-config';
import { hrtime } from 'process';
import {
  getProjectRootDir,
  findProjectByDirectory,
} from '../utils/helpers';
import path from 'path';

const pjson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

const LOGIN_PARAM = 'ticket';
const TICKET_CLAIM_INTERVAL_MS = 1000;

export default abstract class BaseCommand extends Command {
  public static cliBinName = pjson.oclif.bin as string;

  protected timings: Array<{ stage: string, timeHr: [number, number] }> = [];

  private _apiEndpoint?: string;
  private webAppLoginUrl?: string;
  private _lycanClient?: LycanClient;
  private _configPath?: string;

  protected get lycanClient(): LycanClient {
    if (!this._lycanClient) {
      this._lycanClient = this.createLycanClient(this.conf.get('accessToken'));
    }
    return this._lycanClient;
  }

  protected get conf() {
    if (!this._configPath) {
      throw new Error('config not set!');
    }
    return userConfig.load(this._configPath);
  }

  protected get apiEndpoint(): string {
    if (!this._apiEndpoint) {
      throw new Error('apiEndpoint not set!');
    }
    return this._apiEndpoint;
  }

  public get apiHeaders(): Record<string, string> {
    return this.apiHeadersWithKey(this.conf.get('accessToken'));
  }

  private apiHeadersWithKey(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'user-agent': `${pjson.name}/${pjson.version}`,
    };
    if (apiKey) {
      headers['reshuffle-api-key'] = apiKey;
      // TODO(ariels): remove once backend updated
      headers['shift-api-key'] = apiKey;
    }
    return headers;
  }

  // Drops a return value or an exception from p, logging errors as debug
  // messages.  Silences no-floating-promises.  Good e.g. for wrapping
  // analytics calls.
  protected drop<T>(p: Promise<T>, warnFn: (e: string | Error) => any = this.debug.bind(this)) {
    p.catch(warnFn);
  }

  // Starts measuring time for stage.
  protected startStage(stage: string) {
    this.timings.push({ stage, timeHr: hrtime() });
  }

  public static flags: Parser.flags.Input<any> = {
    help: flags.help({ char: 'h' }),
    config: flags.string({
      env: 'RESHUFFLE_CONFIG',
    }),
    apiEndpoint: flags.string({
      default: 'https://api.reshuffle.com/public/v1',
      hidden: true,
      env: 'RESHUFFLE_API_ENDPOINT',
    }),
    webAppLoginUrl: flags.string({
      default: 'https://reshuffle.com/cli-login',
      hidden: true,
      env: 'RESHUFFLE_WEBAPP_LOGIN_URL',
    }),
  };

  protected parse<F, A extends {[name: string]: any}>(opt?: Parser.Input<F>, argv = this.argv): Parser.Output<F, A> {
    if (!opt) {
      opt = this.constructor as Parser.Input<F>;
    }
    if (!opt.flags) {
      opt.flags = BaseCommand.flags;
    }

    return Parser.parse(argv, { context: this, strict: false, ...opt });
  }

  public async init() {
    const { flags: { apiEndpoint, webAppLoginUrl, config } } = this.parse(BaseCommand);
    this._configPath = config || userConfig.defaultLocation;
    this._apiEndpoint = apiEndpoint;
    this.webAppLoginUrl = webAppLoginUrl;
  }

  public async catch(err: Error) {
    if (err instanceof ValidationError) {
      this.error(`Failed to communicate with server: ${err.message}.`, { exit: 7 });
    }
    throw err;
  }

  protected async finally(arg: Error | undefined): Promise<any> {
    this.timings.push({ stage: '', timeHr: hrtime() });
    for (let i = 0; i < this.timings.length - 1; i++) {
      const stage = this.timings[i].stage;
      const next = this.timings[i + 1].timeHr;
      const cur = this.timings[i].timeHr;
      const durationSecs = (next[0] - cur[0]) + 1e-9 * (next[1] - cur[1]);
      this.debug('timing', { stage, durationSecs });
    }
    return super.finally(arg);
  }

  public async authenticate(forceBrowserAuthFlow = false): Promise<string> {
    if (!forceBrowserAuthFlow) {
      const storedAccessToken = this.conf.get('accessToken');
      if (storedAccessToken) {
        return storedAccessToken;
      }
      this.log('No existing Reshuffle credentials found!');
    }

    const { ticket, expires } = await this.lycanClient.createTicket();
    const ticketExpiration = Date.now() + ms(expires);

    const loginHref = this.getBrowserLoginUrl(ticket);
    this.log('A new tab should open in your browser momentarily automatically completing the login process.');
    this.log(`If that does not happen, click ${terminalLink('here', loginHref)}.`);
    try {
      await Cli.open(loginHref);
    } catch (err) {
      // continue trying - link above can still be manually visited
    }

    Cli.action.start('Waiting for login');
    const accessToken = await this.waitForAccessToken(ticket, ticketExpiration);
    Cli.action.stop('');
    if (!accessToken) {
      throw new CLIError('Failed to login.');
    }

    this.log('Successfully logged into Reshuffle!');
    this.conf.set({ accessToken });
    this._lycanClient = this.createLycanClient(accessToken);
    return accessToken;
  }

  private async waitForAccessToken(ticket: string, ticketExpiration: number): Promise<string | undefined> {
    while (Date.now() < ticketExpiration) {
      await Cli.wait(TICKET_CLAIM_INTERVAL_MS);
      try {
        return await this.lycanClient.claimTicket(ticket);
      } catch (err) {
        if (err.name !== 'NotFoundError') {
          throw err;
        }
      }
    }
    return undefined;
  }

  private getBrowserLoginUrl(ticket: string): string {
    if (!this.webAppLoginUrl) {
      throw new Error('webAppLoginUrl not set!');
    }
    const loginUrl = new URL(this.webAppLoginUrl);
    loginUrl.searchParams.set(LOGIN_PARAM, ticket);
    return loginUrl.href;
  }

  private createLycanClient(apiKey?: string): LycanClient {
    const options = { headers: this.apiHeadersWithKey(apiKey) };
    return new LycanClient(this.apiEndpoint, options);
  }

  protected async getLocalAppId(): Promise<string> {
    const projects = this.conf.get('projects') || [];
    const projectDir = await getProjectRootDir();
    const project = findProjectByDirectory(projects, projectDir);
    if (project === undefined) {
      throw new CLIError('Could not find local project settings');
    }
    return project.applicationId;
  }

  protected async getAppIdByNameOrWorkingDirectory(appName?: string): Promise<string> {
    try {
      if (appName) {
        const app = await this.lycanClient.getAppByName(appName);
        return app.id;
      } else {
        try {
          const appId = await this.getLocalAppId();
          return appId;
        } catch {
          throw new CLIError(`No app in current working directory, ${path.resolve()}`);
        }
      }
    } catch (err) {
      if (err.name === 'NotFoundError') {
        throw new CLIError('Cannot find application');
      }
      throw err;
    }
  }
}
