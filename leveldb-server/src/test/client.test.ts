import { mkdtemp } from 'fs';
import rmrf from 'rmfr';
import { tmpdir } from 'os';
import { promisify } from 'util';
import * as path from 'path';
import { Handler } from '../db';
import { setUpTests } from '@binaris/shift-db-testsuite';

setUpTests<{ dbDir: string }>({
  async setUp() {
    const dbDir = await promisify(mkdtemp)(path.join(tmpdir(), 'test-state-'), 'utf8');
    return {
      handler: new Handler(`${dbDir}/root.db`),
      supportsPolling: true,
      context: {
        dbDir,
      },
    };
  },
  async tearDown(ctx) {
    await rmrf(ctx.dbDir);
  },
});
