import path from 'path';
import anyTest, { TestInterface } from 'ava';
import * as td from 'testdouble';
import { success } from 'specshell';
import { readFile, writeFile } from 'mz/fs';
import yaml from 'js-yaml';
import { Configuration } from '../utils/user-config';
import { Context, addFake } from './fake_lycan';
import { createApp } from './utils';


const test = anyTest as TestInterface<Context>;

addFake(test);

const anything = td.matchers.anything();

test.beforeEach(async (t) => {
  t.assert(success(await t.context.shell.run(`cd ${t.context.projectDir}`)));
  t.log(t.context.projectDir);
});



test('no project associated and no apps deployed deploys a new app and associates directory', async (t) => {
  const app = createApp({ id: 'abc' });
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([]);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(t.context.lycanFake.deployInitial(anything, 'default', 'abcabc', [])).thenResolve(app);
  t.context.projectConfig = JSON.stringify({ accessToken: 'setec-astronomy' });
  await writeFile(t.context.configPath, t.context.projectConfig);
  const result = await t.context.shell.run(`${t.context.run} deploy`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
  const config: Configuration = yaml.safeLoad(await readFile(t.context.configPath, 'utf-8'));
  t.deepEqual(config.projects, [
    {
      applicationId: 'abc',
      defaultEnv: 'default',
      directory: t.context.projectDir,
    },
  ]);
});

/* eslint-disable-next-line max-len */
test('no project associated and 1 app deployed prompts user to select app, deploys correct app and associates directory', async (t) => {
  const app = createApp({ id: 'def', name: 'crunchy-pancake-03' });
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([app]);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(t.context.lycanFake.deploy(anything, app.id, 'default', 'abcabc', [])).thenResolve(app);
  t.context.projectConfig = JSON.stringify({ accessToken: 'setec-astronomy' });
  await writeFile(t.context.configPath, t.context.projectConfig);
  // Select first app
  const result = await t.context.shell.run(`echo | ${t.context.run} deploy`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
  const config: Configuration = yaml.safeLoad(await readFile(t.context.configPath, 'utf-8'));
  t.deepEqual(config.projects, [
    {
      applicationId: app.id,
      defaultEnv: 'default',
      directory: t.context.projectDir,
    },
  ]);
});

/* eslint-disable-next-line max-len */
test('no project associated and 1 app deployed prompts user to select app, deploys new app and associates directory', async (t) => {
  const exisitingApp = createApp({ id: 'def', name: 'crunchy-pancake-03' });
  const app = createApp({ id: 'abc' });
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([exisitingApp]);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(t.context.lycanFake.deployInitial(anything, 'default', 'abcabc', [])).thenResolve(app);
  t.context.projectConfig = JSON.stringify({ accessToken: 'setec-astronomy' });
  await writeFile(t.context.configPath, t.context.projectConfig);
  // Scroll and select new app
  const result = await t.context.shell.run(`echo j | ${t.context.run} deploy`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
  const config: Configuration = yaml.safeLoad(await readFile(t.context.configPath, 'utf-8'));
  t.deepEqual(config.projects, [
    {
      applicationId: app.id,
      defaultEnv: 'default',
      directory: t.context.projectDir,
    },
  ]);
});

test('project associated deploys to associated app', async (t) => {
  const app = createApp({ id: 'fluffy-samaritan' });
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([app]);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(t.context.lycanFake.deploy(anything, app.id, 'default', 'abcabc', [])).thenResolve(app);
  const result = await t.context.shell.run(`${t.context.run} deploy`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
  t.is(t.context.projectConfig, await readFile(t.context.configPath, 'utf-8'));
});

test('project associated with --app-name deploys to named app and does not update association', async (t) => {
  const targetApp = createApp({ id: 'abc', name: 'targeted-app-32' });
  td.when(t.context.lycanFake.getAppByName(anything, targetApp.name)).thenResolve(targetApp);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(t.context.lycanFake.deploy(anything, targetApp.id, 'default', 'abcabc', [])).thenResolve(targetApp);
  const result = await t.context.shell.run(`${t.context.run} deploy --app-name ${targetApp.name}`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
  t.is(t.context.projectConfig, await readFile(t.context.configPath, 'utf-8'));
});

test('project not associated with --app-name deploys to named app and does not update association', async (t) => {
  const targetApp = createApp({ id: 'abc', name: 'targeted-app-32' });
  td.when(t.context.lycanFake.getAppByName(anything, targetApp.name)).thenResolve(targetApp);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(t.context.lycanFake.deploy(anything, targetApp.id, 'default', 'abcabc', [])).thenResolve(targetApp);
  t.context.projectConfig = JSON.stringify({ accessToken: 'setec-astronomy' });
  await writeFile(t.context.configPath, t.context.projectConfig);
  const result = await t.context.shell.run(`${t.context.run} deploy --app-name ${targetApp.name}`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
  t.is(t.context.projectConfig, await readFile(t.context.configPath, 'utf-8'));
});

test('given --app-name but app not in list gives informative message', async (t) => {
  td.when(t.context.lycanFake.getAppByName(anything, 'not-found')).thenResolve();
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  const result = await t.context.shell.run(`${t.context.run} deploy --app-name not-found`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
});

test('upload takes .env and --env options', async (t) => {
  const app = createApp({ id: 'fluffy-samaritan' });
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([app]);
  td.when(t.context.uploadFake()).thenReturn({ ok: true, digest: 'abcabc' });
  td.when(
    t.context.lycanFake.deploy(
      anything, app.id, 'default', 'abcabc', [['b', '2'], ['c', '3'], ['a', '1']])
  ).thenResolve(app);
  await writeFile(path.join(t.context.projectDir, '.env'), ['b=4', 'c=3'].join('\n'));
  const result = await t.context.shell.run(`a=1 ${t.context.run} deploy -e a -e b=2`, 'utf-8');
  t.snapshot({ ...result, out: result.out.replace(t.context.projectDir, 'PROJECT_DIR') });
});

test('upload throws if given --env option with no value', async (t) => {
  const app = createApp({ id: 'fluffy-samaritan' });
  td.when(t.context.lycanFake.listApps(anything)).thenResolve([app]);
  const result = await t.context.shell.run(`${t.context.run} deploy -e env_missing`, 'utf-8');
  t.snapshot(result);
});
