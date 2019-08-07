import { Command } from '@oclif/command';
import flags from '../utils/cli-flags';

export default class Login extends Command {
  public static hidden = true;

  public static description = 'Login to ShiftJS';

  public static flags = {
    help: flags.help({ char: 'h' }),
  };

  public static args = [];

  public async run() {
    this.log('Login');
  }
}
