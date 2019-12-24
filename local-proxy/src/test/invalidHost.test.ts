import anyTest, { TestInterface } from 'ava';
import { setupTestHooks, LocalProxyTestInterface } from './setupHooks';
import got from 'got';

const test = anyTest as TestInterface<LocalProxyTestInterface>;
setupTestHooks(test);

test('Invalid Host', async (t) => {
  const reqPromise = got.post(`http://127.0.0.1:${t.context.port}/invoke`, {
    headers: {
      host: 'evil.com',
    },
    json: { path: 'dummyBackend.js', args: [], handler: 'hello' },
    retry: 0, // 403 status is not retryable, check only 500 -> 403 flakiness
  });
  await t.throwsAsync(reqPromise, 'Response code 403 (Forbidden)');
});
