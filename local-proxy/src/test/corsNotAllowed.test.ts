import anyTest, { TestInterface } from 'ava';
import { setupTestHooks, LocalProxyTestInterface } from './setupHooks';
import got from 'got';

const test = anyTest as TestInterface<LocalProxyTestInterface>;
setupTestHooks(test);

test('CORS not allowed with no allow-origin', async (t) => {
  const response = await got(`http://127.0.0.1:${t.context.port}/invoke`, {
    method: 'OPTIONS',
    headers: { 'Access-Control-Allow-Method': 'POST', Origin: 'evil.com' },
    retry: 0,
  });
  t.is(response.statusCode, 200);
  t.is(response.headers['access-control-allow-origin'], undefined);
});
