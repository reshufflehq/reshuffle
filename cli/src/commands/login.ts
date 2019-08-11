import Command from '../utils/command';

export default class Login extends Command {
  public static hidden = true;

  public static description = 'Login to ShiftJS';

  public static args = [];

  public async run() {
    await this.authenticate(true);
  }
}
