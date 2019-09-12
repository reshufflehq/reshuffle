import Command from '../utils/command';
import flags from '../utils/cli-flags';

export default class Login extends Command {
  public static hidden = true;

  public static description = 'Login to Reshuffle';

  public static args = [];

  public static strict = true;

  public static flags = {
    ...Command.flags,
    refetch: flags.boolean({
      char: 'r',
      description: 'Refetch an access token even if one is stored locally',
      default: true,
      allowNo: true,
    }),
  };

  public async run() {
    const { refetch } = this.parse(Login).flags;
    await this.authenticate(refetch);
  }
}
