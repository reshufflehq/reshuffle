import { join } from 'path';
import { homedir } from 'os';
import Conf from 'conf';
import { safeDump, safeLoad } from 'js-yaml';

export default new Conf({
  fileExtension: 'yml',
  serialize: safeDump,
  deserialize: safeLoad,
  clearInvalidConfig: false,
  configName: 'shiftjs.config',
  cwd: join(homedir(), '.shiftjs'),
});
