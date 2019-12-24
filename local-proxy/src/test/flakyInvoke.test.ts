import anyTest, { TestInterface } from 'ava';
import { setupTestHooks, LocalProxyTestInterface } from './setupHooks';
import got from 'got';
import { range } from 'lodash';

const test = anyTest as TestInterface<LocalProxyTestInterface>;
setupTestHooks(test);

// This test should be considered NOT flaky
// This means that if a test run fails there is most likely a bug in the code
test('Regression #36', async (t) => {
  t.timeout(10000);
  const responses = await Promise.all(
    range(100).map(() => got.post(`http://127.0.0.1:${t.context.port}/invoke`, {
      json: { path: 'dummyBackend.js', args: [], handler: 'hello' },
      retry: 0,
      responseType: 'json',
    }))
  );
  t.is(responses.length, 100);
  t.assert(responses.every((elem) => elem.body === 'hello'));
});
