import test, { ExecutionContext } from 'ava';
import { Server } from '../index';
import path from 'path';
import fs from 'fs';

const examplePath = path.join(__dirname, 'examples/index_with_static/');

const examplePathWith404 = path.join(__dirname, 'examples/index_with_404/');

async function testServer(t: ExecutionContext, url: string, expected: any) {
  const server = new Server(examplePath);
  const value = await server.handle(url, {});
  t.deepEqual(expected, value);
}

async function testServerWith404(t: ExecutionContext, url: string, expected: any) {
  const server = new Server(examplePathWith404);
  const value = await server.handle(url, {});
  t.deepEqual(expected, value);
}

test('invoke', testServer, '/invoke', { action: 'handleInvoke' });
test('not-found-to-index', testServer, '/invoke.jsx', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePath, 'index.html'),
});
test('slash-is-index-html', testServer, '/', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePath, 'index.html'),
});
test('index-html-is-index-html', testServer, '/index.html', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePath, 'index.html'),
});
test('auto-html-extension', testServer, '/index', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePath, 'index.html'),
});
test('static-has-cache-hint', testServer, '/static/0.chunk.js', {
  action: 'serveFile',
  cacheHint: {
    'cache-control': 'public, max-age=2629800',
    'last-modified': fs.statSync(path.join(examplePath, 'static/0.chunk.js')).mtime.toUTCString(),
  },
  contentType: 'application/javascript; charset=utf-8',
  fullPath: path.join(examplePath, 'static/0.chunk.js'),
});
test('dot-segements-traversal', testServer, '/a/b/.././../static/0.chunk.js', {
  action: 'serveFile',
  cacheHint: {
    'cache-control': 'public, max-age=2629800',
    'last-modified': fs.statSync(path.join(examplePath, 'static/0.chunk.js')).mtime.toUTCString(),
  },
  contentType: 'application/javascript; charset=utf-8',
  fullPath: path.join(examplePath, 'static/0.chunk.js'),
});
test('dot-segements-traversal-above-root', testServer, '/../static/0.chunk.js', {
  action: 'serveFile',
  cacheHint: {
    'cache-control': 'public, max-age=2629800',
    'last-modified': fs.statSync(path.join(examplePath, 'static/0.chunk.js')).mtime.toUTCString(),
  },
  contentType: 'application/javascript; charset=utf-8',
  fullPath: path.join(examplePath, 'static/0.chunk.js'),
});
test('traversal-to-index-does-not-cache', testServer, '/static/../index.html', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePath, 'index.html'),
});
test('invoke-with-404', testServerWith404, '/invoke', { action: 'handleInvoke' });
test('not-found-to-404', testServerWith404, '/invoke.jsx', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePathWith404, '404.html'),
  status: 404,
});
test('slash-is-index-html-with-404', testServerWith404, '/', {
  action: 'serveFile',
  cacheHint: {},
  contentType: 'text/html; charset=utf-8',
  fullPath: path.join(examplePathWith404, 'index.html'),
});
