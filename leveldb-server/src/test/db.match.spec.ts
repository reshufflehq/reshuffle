import { test } from '@binaris/shift-db-testsuite/dist/match';
import { testing } from '../db';

const { match } = testing;

test.beforeEach(async (t) => {
  t.context.match = async (...args) => match(...args);
});
