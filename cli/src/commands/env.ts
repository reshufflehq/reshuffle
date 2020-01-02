import Command from '../utils/command';
import flags from '../utils/cli-flags';
import { getEnvOrDie } from '../utils/helpers';
import fromPairs from 'lodash.frompairs';

function nonEmpty<T>(x: T[]) { return x.length > 0; }

interface VariableValue {
  variable: string;
  value: string | undefined;
}

function vvToString({ variable, value }: VariableValue): string {
  return `${variable}=${typeof value === 'string' ? `"${value}"` : value}`;
}

export default class Env extends Command {
  public static description = 'manipulate environment of deployed app';
  public static hidden = true;

  public static examples = [
    `$ ${Command.cliBinName} env --list --app-name fluffy-teapot-76`,
    `$ ${Command.cliBinName} env --get PGUSER --get PGPASSWORD`,
    `$ PGPASSWORD=secret ${Command.cliBinName} env --set PGUSER=admin --set-from-env PGPASSWORD`,
  ];

  public static args = [];

  public static flags = {
    ...Command.flags,
    'app-name': flags.string({
      char: 'n',
      description: 'If provided access variables for given app',
    }),
    set: flags.keyValue({
      char: 's',
      description: 'set VAR=value ...',
      multiple: true,
      default: [],
    }),
    unset: flags.string({
      char: 'u',
      description: 'unset VAR ...',
      multiple: true,
      default: [],
    }),
    'set-from-env': flags.string({
      char: 'S',
      description: 'set from value in local environment (more secure than --set)',
      multiple: true,
      default: [],
    }),
    get: flags.string({
      char: 'g',
      description: 'get VAR',
      multiple: true,
      default: [],
    }),
    list: flags.boolean({
      char: 'l',
      description: 'list all variables',
      default: false,
    }),
  };

  public async run() {
    await this.authenticate();
    const { flags: {
      'app-name': appName,
      get,
      set,
      'set-from-env': setFromEnv,
      unset,
      list,
    } } = this.parse(Env);
    const appId = await this.getAppIdByNameOrWorkingDirectory(appName);
    // Various commands are *not* executed in sequence of specified
    // flags, but this ordering makes sense.
    if (nonEmpty(get)) {
      await this.get(appId, get);
    }
    if (nonEmpty(set) || nonEmpty(setFromEnv) || nonEmpty(unset)) {
      const setVariables = [
        ...set.map(({ key, value }) => ({ variable: key, value })),
        ...setFromEnv.map((variable) => ({ variable, value: getEnvOrDie(variable) })),
      ];
      await this.set(appId, setVariables, unset);
    }
    if (list) {
      await this.list(appId);
    }
  }

  protected async get(appId: string, variableNames: string[]) {
    const { variables } = await this.lycanClient.getEnv(appId, variableNames);
    const indexed = fromPairs(variables.map(({ variable, value }) => [variable, value]));
    // Output in requested order.
    for (const variable of variableNames) {
      this.log(vvToString({ variable, value: indexed[variable] }));
    }
  }

  protected async list(appId: string) {
    const { variables } = await this.lycanClient.getEnv(appId, null);
    // Output in sorted order (of variable names).
    const sorted = variables.map(vvToString).sort();
    this.log(sorted.join('\n'));
  }

  protected async set(appId: string, variables: Array<{ variable: string, value: string }>, unset: string[]) {
    await this.lycanClient.setEnv(
      appId,
      false,
      { variables: variables.map((vv) => ({ ...vv, source: 'user:edit' })) },
      unset);
  }
}
