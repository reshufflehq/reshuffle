import Command from '../utils/command';

export default class Destroy extends Command {
  public static description = 'destroy an application';
  public static examples = [
    `$ ${Command.cliBinName} destroy 123`,
  ];

  public static args = [
    {
      name: 'id',
      required: true,
      description: 'application id',
    },
  ];

  public static strict = true;

  public async run() {
    const { args } = this.parse(Destroy);
    await this.authenticate();
    await this.lycanClient.destroyApp(args.id);
    this.log('Application successfully destroyed!');
  }
}
