import { readFileSync } from 'fs';
import { resolve } from 'path';
import { URL } from 'url';
import { Command } from '@oclif/command';
import { CLIError } from '@oclif/errors';
import * as Parser from '@oclif/parser';
import open from 'open';
import ms from 'ms';
import terminalLink from 'terminal-link';
import { LycanClient } from '@binaris/spice-node-client';
import flags from './cli-flags';
import userConfig from './user-config';

const pjson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

const LOGIN_PARAM = 'ticket';
const TICKET_CLAIM_INTERVAL_MS = 1000;

export default abstract class BaseCommand extends Command {
  public static cliBinName = pjson.oclif.bin as string;

  private apiEndpoint?: string;
  private webAppLoginUrl?: string;
  protected _lycanClient?: LycanClient;
  protected get lycanClient(): LycanClient {
    if (!this._lycanClient) {
      this._lycanClient = this.createLycanClient(userConfig.get('accessToken') as string | undefined);
    }
    return this._lycanClient;
  }

  public static flags = {
    help: flags.help({ char: 'h' }),
    apiEndpoint: flags.string({
      default: 'https://api.shiftjs.com/public/v1',
      hidden: true,
      env: 'SHIFTJS_API_ENDPOINT',
    }),
    webAppLoginUrl: flags.string({
      default: 'https://app.shiftjs.com/cli-login',
      hidden: true,
      env: 'SHIFTJS_WEBAPP_LOGIN_URL',
    }),
  };

  protected parse<F, A extends {[name: string]: any}>(opt?: Parser.Input<F>, argv = this.argv): Parser.Output<F, A> {
    if (!opt) {
      opt = this.constructor as any;
    }
    if (!opt!.flags) {
      opt!.flags = BaseCommand.flags as any;
    }

    return require('@oclif/parser').parse(argv, { context: this, ...opt });
  }

  public async init() {
    const { flags: { apiEndpoint, webAppLoginUrl } } = this.parse(BaseCommand);
    this.apiEndpoint = apiEndpoint;
    this.webAppLoginUrl = webAppLoginUrl;
  }

  public async authenticate(forceBrowserAuthFlow = false): Promise<string> {
    if (!forceBrowserAuthFlow) {
      const storedAccessToken = userConfig.get('accessToken') as string | undefined;
      if (storedAccessToken) {
        return storedAccessToken;
      }
      this.log('No existing ShiftJS credentials found!');
    }

    const { ticket, expires } = await this.lycanClient.createTicket();
    const ticketExpiration = Date.now() + ms(expires);

    const loginHref = this.getBrowserLoginUrl(ticket);
    this.log('A new tab should open in your browser momentarily automatically completing the login process.');
    this.log(`If that does not happen, click ${terminalLink('here', loginHref)}.`);
    await open(loginHref);

    let accessToken: string | undefined;
    while (accessToken === undefined && Date.now() < ticketExpiration) {
      await sleep(TICKET_CLAIM_INTERVAL_MS);
      try {
        accessToken = await this.lycanClient.claimTicket(ticket);
      } catch (err) {
        if (err.name !== 'NotFoundError') {
          throw err;
        }
      }
    }

    if (!accessToken) {
      throw new CLIError('Failed to login.');
    }

    this.log('Successfully logged into ShiftJS!');
    userConfig.set({ accessToken });
    this._lycanClient = this.createLycanClient(accessToken);
    return accessToken;
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
    const options = apiKey ? {
      headers: {
        'shift-api-key': apiKey,
      },
    } : {};
    if (!this.apiEndpoint) {
      throw new Error('apiEndpoint not set!');
    }
    return new LycanClient(this.apiEndpoint, options);
  }
}

function sleep(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
