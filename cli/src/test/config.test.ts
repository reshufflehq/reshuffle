import test from 'ava';
import { homedir } from 'os';
import { join } from 'path';
import { defaultLocation, deconstruct } from '../utils/user-config';

test('userConfig.deconstruct for defaultLocation returns expected values', (t) => {
  const { fileExtension, configName, cwd } = deconstruct(defaultLocation);
  t.is(cwd, join(homedir(), '.shiftjs'));
  t.is(configName, 'shiftjs.config');
  t.is(fileExtension, 'yml');
});
