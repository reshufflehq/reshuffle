import anyTest, { TestInterface } from 'ava';
import { setupTestHooks, LocalProxyTestInterface } from './setupHooks';
import got from 'got';

const test = anyTest as TestInterface<LocalProxyTestInterface>;
setupTestHooks(test);

test('user handler overrides', async (t) => {
  {
    const response = await got(`http://127.0.0.1:${t.context.port}/userHandler`, {
      method: 'GET',
    });
    t.is(response.statusCode, 200);
    t.is(response.body, 'hello world');
  }
  {
    const response = await got.post(`http://127.0.0.1:${t.context.port}/invoke`, {
      headers: {},
      body: { path: 'dummyBackend.js', args: [], handler: 'hello', },
      json: true,
    });
    t.is(response.body, 'hello');
  }
});
