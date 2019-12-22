import anyTest, { TestInterface } from 'ava';
import { setupTestHooks, LocalProxyTestInterface } from './setupHooks';
import got from 'got';

const test = anyTest as TestInterface<LocalProxyTestInterface>;
setupTestHooks(test);

test('Non-whitelisted modules not allowed by default', async (t) => {
  const reqPromise = got.post(`http://127.0.0.1:${t.context.port}/invoke`, {
    json: { path: '/', args: [], handler: 'hello' },
  });
  await t.throwsAsync(reqPromise, 'Response code 403 (Forbidden)');
});
