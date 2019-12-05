import { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Shell, success } from 'specshell';
import { LycanHandler, LycanServer } from '@binaris/spice-koa-server';
import { AddressInfo, Server } from 'net';
import { tmpdir } from 'os';
import { mkdir, mkdtemp, realpath, writeFile } from 'mz/fs';
import { env as processEnv } from 'process';
import * as path from 'path';
import { remove, mkdirp } from 'fs-extra';
import shellEscape from 'any-shell-escape';

export interface UploadSuccess {
  ok: true;
  digest: string;
}

export interface UploadError {
  ok: false;
}

export type UploadResult = UploadSuccess | UploadError;

export interface Context {
  shell: Shell;
  run: string;
  configDir: string;
  configPath: string;
  projectConfig: string;
  projectDir: string;
  lycanUrl: string;
  uploadFake: td.TestDouble<() => UploadResult>;
  lycanFake: td.TestDouble<LycanHandler>;
  lycanServer: LycanServer;
  server: Server;
}

// Adds before and after hooks to help test with a shell against a
// fake Lycan server.
export function addFake<C extends Context>(test: TestInterface<C>) {
  test.beforeEach(async (t) => {
    // Quoted in case dirname includes spaces etc.
    t.context.run = shellEscape(path.resolve(__dirname, '../..', 'bin/run'));
    t.context.configDir = await realpath(await mkdtemp(path.join(tmpdir(), 'dot-reshuffle-'), 'utf8'));
    // On MacOS temporary directories hide behind multiple symlinks,
    // the upwards search for a package.json fails if we don't resolve
    // then realpath.
    t.context.configPath = path.resolve(t.context.configDir, 'config.yml');
    t.context.projectDir = path.resolve(t.context.configDir, 'project');
    t.context.projectConfig = `
accessToken: setec-astronomy
projects:
  - directory: ${t.context.projectDir}
    applicationId: fluffy-samaritan
    defaultEnv: default
`;
    await writeFile(t.context.configPath, t.context.projectConfig);
    await mkdir(t.context.projectDir);
    await mkdir(path.join(t.context.projectDir, 'backend'));
    await writeFile(path.join(t.context.projectDir, 'backend', 'index.js'), '');
    await mkdirp(path.join(t.context.projectDir, 'node_modules/.bin'));
    await writeFile(path.join(t.context.projectDir, 'node_modules/.bin/babel'), 'echo built', { mode: 0o755 });
    await writeFile(path.join(t.context.projectDir, 'package.json'), JSON.stringify({
      name: 'poll',
      scripts: {
        build: 'echo nothing to do',
      },
      dependencies: {},
    }));
    await writeFile(path.join(t.context.projectDir, 'package-lock.json'), JSON.stringify({}));
  });

  test.serial.beforeEach(async (t) => {
    t.context.lycanFake = {
      async extractContext() { return { debugId: 'fake', ip: '127.0.0.1' }; },

      createTicket: td.function<LycanHandler['createTicket']>(),
      claimTicket: td.function<LycanHandler['claimTicket']>(),
      listTemplates: td.function<LycanHandler['listTemplates']>(),
      tryTemplate: td.function<LycanHandler['tryTemplate']>(),
      whoami: td.function<LycanHandler['whoami']>(),
      listApps: td.function<LycanHandler['listApps']>(),
      getApp: td.function<LycanHandler['getApp']>(),
      getAppByName: td.function<LycanHandler['getAppByName']>(),
      deployInitial: td.function<LycanHandler['deployInitial']>(),
      deploy: td.function<LycanHandler['deploy']>(),
      claimApp: td.function<LycanHandler['claimApp']>(),
      getLogs: td.function<LycanHandler['getLogs']>(),
      getLogsByName: td.function<LycanHandler['getLogsByName']>(),
      destroyApp: td.function<LycanHandler['destroyApp']>(),
      destroyAppByName: td.function<LycanHandler['destroyAppByName']>(),
      reportAnalytics: td.function<LycanHandler['reportAnalytics']>(),
      renameApp: td.function<LycanHandler['renameApp']>(),
      renameAppByName: td.function<LycanHandler['renameAppByName']>(),
      addAppDomain: td.function<LycanHandler['addAppDomain']>(),
      removeAppDomain: td.function<LycanHandler['removeAppDomain']>(),
      triggerAppDomainVerification: td.function<LycanHandler['triggerAppDomainVerification']>(),
    };

    t.context.uploadFake = td.function<() => UploadResult>();
    t.context.lycanServer = new LycanServer(t.context.lycanFake, true);
    // Router is private, hackily access it
    (t.context.lycanServer as any).router.koaRouter.post('/code', (ctx: any) => {
      const res = t.context.uploadFake();
      if (res.ok) {
        ctx.body = { digest: res.digest };
      } else {
        ctx.throw(500);
      }
    });
    t.context.server = await t.context.lycanServer.listen(0);
    t.context.lycanUrl = `http://localhost:${(t.context.server.address() as AddressInfo).port}`;
    t.context.shell = new Shell(undefined, {
      env: {
        ...processEnv,
        RESHUFFLE_CONFIG: t.context.configPath,
        RESHUFFLE_API_ENDPOINT: t.context.lycanUrl,
      },
    });
    t.assert(success(await t.context.shell.run(`cd ${shellEscape(t.context.projectDir)}`, 'utf-8')));
  });

  test.afterEach.always(async (t) => {
    // tslint:disable-next-line strict-boolean-expressions (server not set until late in beforeEach)
    if (t.context.server) t.context.server.close();
    await remove(t.context.configDir);
  });
}
