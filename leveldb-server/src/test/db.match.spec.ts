import { test } from '@reshuffle/db-testsuite/dist/match';
import { testing } from '../db';

const { match } = testing;

test.beforeEach(async (t) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  t.context.match = async (...args) => match(...args);
});
