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

const pjson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

const LOGIN_PARAM = 'ticket';
const TICKET_CLAIM_INTERVAL_MS = 1000;

export default abstract class BaseCommand extends Command {
  public static cliBinName = pjson.oclif.bin as string;

  private _apiEndpoint?: string;
  private webAppLoginUrl?: string;
  private _lycanClient?: LycanClient;
  private _configPath?: string;

  protected get lycanClient(): LycanClient {
    if (!this._lycanClient) {
      this._lycanClient = this.createLycanClient(this.conf.get('accessToken') as string | undefined);
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
    return this.apiHeadersWithKey(this.conf.get('accessToken') as string | undefined);
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

  public static flags: Parser.flags.Input<any>  = {
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

  public async authenticate(forceBrowserAuthFlow = false): Promise<string> {
    if (!forceBrowserAuthFlow) {
      const storedAccessToken = this.conf.get('accessToken') as string | undefined;
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
    await Cli.open(loginHref);

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
}
