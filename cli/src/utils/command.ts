import { Command } from '@oclif/command';
import flags from './cli-flags';

export default abstract class BaseCommand extends Command {
  public static flags = {
    help: flags.help({ char: 'h' }),
    realm: flags.string({
      default: 'prod',
      hidden: true,
      env: 'realm',
    }),
  };

  protected parse<F, A extends {[name: string]: any}>(opt?: Parser.Input<F>, argv = this.argv): Parser.Output<F, A> {
    if (!opt) {
      opt = this.constructor as any;
    }
    if (!opt!.flags) {
      opt!.flags = BaseCommand.flags as any;
    }

    return require('@oclif/parser').parse(argv, { context: this, ...opt });
  }

  async init() {
  }
}
