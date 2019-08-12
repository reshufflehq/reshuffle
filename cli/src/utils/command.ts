import { Command } from '@oclif/command';
import { CLIError } from '@oclif/errors';
import * as Parser from '@oclif/parser';
import { URL } from 'url';
import open from 'open';
import ms from 'ms';
import terminalLink from 'terminal-link';
import { LycanClient } from '@binaris/spice-node-client';
import flags from './cli-flags';
import userConfig from './user-config';

const LOGIN_PARAM = 'ticket';
const TICKET_CLAIM_INTERVAL_MS = 1000;

export default abstract class BaseCommand extends Command {
  protected realm?: string;
  protected lycanClient?: LycanClient;

  public static flags = {
    help: flags.help({ char: 'h' }),
    realm: flags.string({
      default: 'prod',
      hidden: true,
      env: 'realm',
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
    const { flags: { realm } } = this.parse(BaseCommand);
    this.realm = realm;
    this.lycanClient = new LycanClient(`${this.getBaseUrl('api')}/public/v1`);
  }

  public async authenticate(force = false): Promise<string> {
    if (!force) {
      const storedAccessToken = userConfig.get('accessToken') as string | undefined;
      if (storedAccessToken) {
        return storedAccessToken;
      }
      this.log('No existing ShiftJS credentials found!');
    }

    if (!this.lycanClient) {
      throw new CLIError('Client not initialized!');
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
    return accessToken;
  }

  private getBrowserLoginUrl(ticket: string): string {
    const loginUrl = new URL(`${this.getBaseUrl('app')}/cli-login`);
    loginUrl.searchParams.set(LOGIN_PARAM, ticket);
    return loginUrl.href;
  }

  private getBaseUrl(subdomain: string, protocol: 'http' | 'https' = 'https') {
    const realm = this.realm;
    if (!realm) {
      throw new Error('realm not set!');
    }
    const domain = realm === 'prod' ? 'shiftjs.com' : 'shiftjs.io';
    const actualSubdomain = realm === 'prod' ? subdomain :
      subdomain === 'app' ? realm :
      `${subdomain}-${realm}`;
    return `${protocol}://${actualSubdomain}.${domain}`;
  }
}

function sleep(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
