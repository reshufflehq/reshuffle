import Command from '../utils/command';
import { cliBinName } from '../utils/config';

export default class Deploy extends Command {
  public static description = 'deploy your ShiftJS project to its associated domain';

  public static examples = [
    `$ ${cliBinName} deploy`,
  ];

  public static args = [];

  public async run() {
    this.log('Deploy');
  }
}
