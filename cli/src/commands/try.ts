import Command from '../utils/command';
import terminalLink from 'terminal-link';

export default class Try extends Command {
  public static description = 'try a template';
  public static hidden = true;
  public static examples = [
    `$ ${Command.cliBinName} try 123`,
  ];

  public static args = [
    {
      name: 'ID',
      required: true,
      description: 'template id',
    },
  ];

  public static strict = true;

  public async run() {
    const { args } = this.parse(Try);
    const { token, expiresAt, domain } = await this.lycanClient.tryTemplate(args.ID);
    const link = terminalLink(domain, `https://${domain}`, { fallback: (_, url) => url });
    this.log(`Try the app at ${link}. The trial will expire at ${expiresAt.toISOString()}`);
    this.log(`To claim it run '${Command.cliBinName} claim ${token}'`);
  }
}
