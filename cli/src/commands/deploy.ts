import { Command } from '@oclif/command';
import flags from '../utils/cli-flags';
import { cliBinName } from '../utils/config';

export default class Deploy extends Command {
  public static description = 'deploy your ShiftJS project to its associated domain';

  public static examples = [
    `$ ${cliBinName} deploy`,
  ];

  public static flags = {
    help: flags.help({ char: 'h' }),
  };

  public static args = [];

  public async run() {
    this.log('Deploy');
  }
}
