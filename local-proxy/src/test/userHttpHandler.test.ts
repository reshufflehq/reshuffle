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
    const response = await got(`http://127.0.0.1:${t.context.port}/notFound`, {
      method: 'GET',
      throwHttpErrors: false,
    });
    t.is(response.statusCode, 404);
  }
});
