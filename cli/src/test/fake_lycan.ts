import { TestInterface } from 'ava';
import * as td from 'testdouble';
import { Shell } from 'specshell';
import { LycanHandler, LycanServer } from '@binaris/spice-koa-server';
import { AddressInfo, Server } from 'net';
import { tmpdir } from 'os';
import { mkdtemp, writeFile } from 'mz/fs';
import { env as processEnv } from 'process';
import * as path from 'path';

// TODO(ariels): Move to separate fake file (to test all commands).
export interface Context {
  shell: Shell;
  configDir: string;
  configPath: string;
  lycanUrl: string;
  lycanFake: td.TestDouble<LycanHandler>;
  lycanServer: LycanServer;
  server: Server;
}

// Adds before and after hooks to help test with a shell against a
// fake Lycan server.
export function addFake<C extends Context>(test: TestInterface<C>) {
  test.before(async (t) => {
    t.context.configDir = await mkdtemp(path.join(tmpdir(), 'dot-shiftjs-'), 'utf8');
    t.context.configPath = `${t.context.configDir}/config.yml`;
    await writeFile(t.context.configPath, `
accessToken: setec-astronomy
`);
    // BUG(ariels): Delete in test.after!
  });

  test.beforeEach(async (t) => {
    t.context.lycanFake = {
      async extractContext() { return { debugId: 'fake' }; },

      createTicket: td.function<LycanHandler['createTicket']>(),
      claimTicket: td.function<LycanHandler['claimTicket']>(),
      listTemplates: td.function<LycanHandler['listTemplates']>(),
      tryTemplate: td.function<LycanHandler['tryTemplate']>(),
      whoami: td.function<LycanHandler['whoami']>(),
      listApps: td.function<LycanHandler['listApps']>(),
      deployInitial: td.function<LycanHandler['deployInitial']>(),
      deploy: td.function<LycanHandler['deploy']>(),
      claimApp: td.function<LycanHandler['claimApp']>(),
      getLogs: td.function<LycanHandler['getLogs']>(),
      destroyApp: td.function<LycanHandler['destroyApp']>(),
    };

    t.context.lycanServer = new LycanServer(t.context.lycanFake, true);
    t.context.server = await t.context.lycanServer.listen(0);
    t.context.lycanUrl = `http://localhost:${(t.context.server.address() as AddressInfo).port}`;
    t.context.shell = new Shell(undefined, {
      env: {
        ...processEnv,
        SHIFTJS_CONFIG: t.context.configPath,
        SHIFTJS_API_ENDPOINT: t.context.lycanUrl,
      }});
  });

  test.afterEach((t) => { t.context.server.close(); });
}
