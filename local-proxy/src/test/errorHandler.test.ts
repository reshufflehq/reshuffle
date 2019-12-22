import anyTest, { TestInterface } from 'ava';
import { setupTestHooks, LocalProxyTestInterface } from './setupHooks';
import got from 'got';

const test = anyTest as TestInterface<LocalProxyTestInterface>;
setupTestHooks(test);

test('error invoke', async (t) => {
  await t.throwsAsync(got.post(`http://127.0.0.1:${t.context.port}/invoke`, {
    json: { path: 'testStackTrace.js', args: [], handler: 'testStackTrace' },
  }), /Internal Server Error/);
  const stderr = t.context.stderr.join('\n');
  // we are testing that the original file uses line 3 (not line 9)
  // additional check is that we are not seeing a '/.reshuffle/' segment in the path
  // TODO: we are using js -> js babel transform since ts -> js -> js source maps are not preserved
  t.assert(/\.reshuffle-local-proxy-[^/]*\/backend\/testStackTrace\.js:3:9/.test(stderr));
});
