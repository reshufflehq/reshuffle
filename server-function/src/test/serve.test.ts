import test, { ExecutionContext } from 'ava';
import { Server } from '../index';

async function testServer(t: ExecutionContext, url: string, expected: any) {
  const server = new Server(process.cwd());
  const value = await server.handle(url, {});
  t.deepEqual(expected, value);
}

test('invoke', testServer, '/invoke', { action: 'handleInvoke' });
test('not-found', testServer, '/invoke.jsx', { action: 'sendStatus', status: 404 });
