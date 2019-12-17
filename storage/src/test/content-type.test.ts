import test from 'ava';
import { makeContentTypeAcceptor } from '../content-type';

test('makeContentTypeAcceptor with empty opts rejects number', (t) => {
  t.false(makeContentTypeAcceptor()(7));
});

test('makeContentTypeAcceptor with accept opt rejects number', (t) => {
  t.false(makeContentTypeAcceptor('image/jpeg')(7));
});

test('makeContentTypeAcceptor with empty opts accepts undefined', (t) => {
  t.true(makeContentTypeAcceptor()(undefined));
});

test('makeContentTypeAcceptor with empty opts accepts string', (t) => {
  t.true(makeContentTypeAcceptor()('image/png'));
});

test('makeContentTypeAcceptor with accept opt rejects undefined', (t) => {
  t.false(makeContentTypeAcceptor('image/jpeg')(undefined));
});

test('makeContentTypeAcceptor with accept string opt accepts exact type', (t) => {
  t.true(makeContentTypeAcceptor('image/jpeg')('image/jpeg'));
});

test('makeContentTypeAcceptor with accept string opt rejects mismatching type', (t) => {
  t.false(makeContentTypeAcceptor('image/jpeg')('image/png'));
});

test('makeContentTypeAcceptor with accept regexp opt accepts matching type', (t) => {
  t.true(makeContentTypeAcceptor(/image\/.*/)('image/png'));
});

test('makeContentTypeAcceptor with accept regexp opt rejects mismatching type', (t) => {
  t.false(makeContentTypeAcceptor(/image\/.*/)('text/plain'));
});
