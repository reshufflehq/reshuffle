import { Command, flags } from '@oclif/command';

export default class Deploy extends Command {
  public static description = 'deploy your ShiftJS project to its associated domain';

  public static examples = [
    '$ shift-cli deploy',
  ];

  public static flags = {
    help: flags.help({char: 'h'}),
  };

  public static args = [];

  public async run() {
    this.log('Deploy');
  }
}
