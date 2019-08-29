import Command from '../utils/command';

export default class WhoAmI extends Command {
  public static description = 'print your identity';
  public static hidden = false;
  public static examples = [
    `$ ${Command.cliBinName} whoami`,
  ];

  public static args = [];

  public static strict = true;

  public async run() {
    this.parse(WhoAmI);
    const { id, fullName, email } = await this.lycanClient.whoami();
    this.log(`You are ${fullName} (${email})`);
    this.log(`Your id is ${id}`);
  }
}
