import Command from '../utils/command';
import terminalLink from 'terminal-link';

export default class Claim extends Command {
  public static description = 'claim an application';
  public static hidden = false;
  public static examples = [
    `$ ${Command.cliBinName} claim OiJIUzI1NiIsIn`,
  ];

  public static args = [
    {
      name: 'token',
      required: true,
      description: 'claim token',
    },
  ];

  public static strict = true;

  public async run() {
    const { args } = this.parse(Claim);
    await this.authenticate();
    const app = await this.lycanClient.claimApp(args.token);
    const domain = app.environments[0].domains[0].name;
    const link = terminalLink(domain, `https://${domain}`, { fallback: (_, url) => url });
    this.log(`Project successfully claimed! Your project is now available at: ${link}`);
  }
}
