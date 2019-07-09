import test from 'ava';
import { match, Q } from '../db';

test('eq checks for strict equality', (t) => {
  t.true(match({ key: 'abc', value: 3 }, Q.value.eq(3)));
  t.false(match({ key: 'abc', value: 3 }, Q.value.eq(2)));
  t.false(match({ key: 'abc', value: 3 }, Q.value.eq('3')));
});

test('ne checks for strict equality', (t) => {
  t.false(match({ key: 'abc', value: 3 }, Q.value.ne(3)));
  t.true(match({ key: 'abc', value: 3 }, Q.value.ne(2)));
  t.true(match({ key: 'abc', value: 3 }, Q.value.ne('3')));
});

test('gt checks for same type', (t) => {
  t.true(match({ key: 'abc', value: 3 }, Q.value.gt(2)));
  t.false(match({ key: 'abc', value: 3 }, Q.value.gt('2')));
  t.true(match({ key: 'abc', value: 3 }, Q.key.gt('ab')));
  t.false(match({ key: 'abc', value: 3 }, Q.key.gt(2 as any)));
});

test('lt checks for same type', (t) => {
  t.true(match({ key: 'abc', value: 3 }, Q.value.lt(4)));
  t.false(match({ key: 'abc', value: 3 }, Q.value.lt('4')));
  t.true(match({ key: 'abc', value: 3 }, Q.key.lt('abd')));
  t.false(match({ key: 'abc', value: 3 }, Q.key.lt(4 as any)));
});

test('gte checks for same type', (t) => {
  t.true(match({ key: 'abc', value: 3 }, Q.value.gte(2)));
  t.true(match({ key: 'abc', value: 3 }, Q.value.gte(3)));
  t.false(match({ key: 'abc', value: 3 }, Q.value.gte('2')));
  t.false(match({ key: 'abc', value: 3 }, Q.value.gte('3')));
  t.true(match({ key: 'abc', value: 3 }, Q.key.gte('ab')));
  t.true(match({ key: 'abc', value: 3 }, Q.key.gte('abc')));
  t.false(match({ key: 'abc', value: 3 }, Q.key.gte(2 as any)));
});

test('lte checks for same type', (t) => {
  t.true(match({ key: 'abc', value: 3 }, Q.value.lte(4)));
  t.true(match({ key: 'abc', value: 3 }, Q.value.lte(3)));
  t.false(match({ key: 'abc', value: 3 }, Q.value.lte('4')));
  t.false(match({ key: 'abc', value: 3 }, Q.value.lte('3')));
  t.true(match({ key: 'abc', value: 3 }, Q.key.lte('abd')));
  t.true(match({ key: 'abc', value: 3 }, Q.key.lte('abc')));
  t.false(match({ key: 'abc', value: 3 }, Q.key.lte(4 as any)));
});

test('exists checks for undefined', (t) => {
  t.true(match({ key: 'abc', value: null }, Q.value.exists()));
  t.true(match({ key: 'abc', value: 0 }, Q.value.exists()));
  t.true(match({ key: 'abc', value: 'a' }, Q.value.exists()));
  t.false(match({ key: 'abc', value: {} }, Q.value.a.exists()));
});

test('isNull checks for null', (t) => {
  t.true(match({ key: 'abc', value: null }, Q.value.isNull()));
  t.false(match({ key: 'abc', value: 0 }, Q.value.isNull()));
  t.false(match({ key: 'abc', value: 'a' }, Q.value.isNull()));
  t.false(match({ key: 'abc', value: {} }, Q.value.a.isNull()));
});

test('matches matches string', (t) => {
  t.false(match({ key: 'abc', value: null }, Q.value.matches(/abc/i)));
  t.false(match({ key: 'abc', value: 0 }, Q.value.matches(/abc/i)));
  t.true(match({ key: 'abc', value: 'abc' }, Q.value.matches(/abc/i)));
  t.true(match({ key: 'abc', value: 'ABC' }, Q.value.matches(/abc/i)));
  t.false(match({ key: 'abc', value: 'ABC' }, Q.value.matches(/abc/)));
});

test('startsWith matches string', (t) => {
  t.false(match({ key: 'abc', value: null }, Q.value.startsWith('ab')));
  t.false(match({ key: 'abc', value: 0 }, Q.value.startsWith('ab')));
  t.true(match({ key: 'abc', value: 'abc' }, Q.value.startsWith('ab')));
  t.false(match({ key: 'abc', value: 'ABC' }, Q.value.startsWith('ab')));
});

test('and applies all filters', (t) => {
  t.true(match({ key: 'abc', value: 0 }, Q.all(Q.key.startsWith('ab'), Q.value.eq(0))));
  t.false(match({ key: 'abc', value: 0 }, Q.all(Q.key.startsWith('ab'), Q.value.eq(1))));
  t.false(match({ key: 'abc', value: 0 }, Q.all(Q.key.eq('ab'), Q.value.eq(0))));
  t.false(match({ key: 'abc', value: 0 }, Q.all(Q.key.eq('ab'), Q.value.eq(1))));
});

test('or applies all filters', (t) => {
  t.true(match({ key: 'abc', value: 0 }, Q.any(Q.key.startsWith('ab'), Q.value.eq(0))));
  t.true(match({ key: 'abc', value: 0 }, Q.any(Q.key.startsWith('ab'), Q.value.eq(1))));
  t.true(match({ key: 'abc', value: 0 }, Q.any(Q.key.eq('ab'), Q.value.eq(0))));
  t.false(match({ key: 'abc', value: 0 }, Q.any(Q.key.eq('ab'), Q.value.eq(1))));
});

test('not negates a filter', (t) => {
  t.true(match({ key: 'abc', value: 0 }, Q.not(Q.key.eq('ab'))));
  t.false(match({ key: 'abc', value: 0 }, Q.not(Q.key.startsWith('ab'))));
});
