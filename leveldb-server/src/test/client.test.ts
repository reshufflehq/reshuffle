import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { tmpdir } from 'os';
import { promisify } from 'util';
import * as path from 'path';
import { Handler } from '../db';
import { setUpTests } from '@reshuffle/db-testsuite/dist/client';

setUpTests<{ dbDir: string, errorsOk?: boolean, errors: Error[] }>({
  async setUp() {
    const errors: Error[] = [];
    const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
    return {
      handler: new Handler(`${dbDir}/root.db`, (err) => err && errors.push(err)),
      supportsPolling: true,
      context: {
        dbDir,
        errors,
      },
    };
  },
  async tearDown(ctx) {
    if (!ctx.errorsOk && ctx.errors.length > 0) {
      throw new Error(`Unexamined errors: ${ctx.errors}`);
    }
    await rmrf(ctx.dbDir);
  },
});
