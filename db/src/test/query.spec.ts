import test from 'ava';
import { IllegalArgumentError } from '../errors';
import { key, all, any, not, value, typedValue } from '../query';

function stringifyParse(value: any) {
  return JSON.parse(JSON.stringify(value));
}

test('key builds a filter on document key', (t) => {
  t.deepEqual(stringifyParse(key.eq('abc')), { path: ['key'], operator: 'eq', value: 'abc' });
});

test('value builds a filter on document value', (t) => {
  t.deepEqual(stringifyParse(value.eq('abc')), { path: ['value'], operator: 'eq', value: 'abc' });
});

test('value.field() builds a nested filter on document value', (t) => {
  t.deepEqual(stringifyParse(value.field('a.b').eq('abc')), { path: ['value', 'a.b'], operator: 'eq', value: 'abc' });
});

test('value.field(number) casts path to string', (t) => {
  t.deepEqual(stringifyParse(value.field(7).eq('abc')), { path: ['value', '7'], operator: 'eq', value: 'abc' });
});

test('value.field(reserved field) generates a path', (t) => {
  t.deepEqual(stringifyParse(value.field('eq').eq('abc')), { path: ['value', 'eq'], operator: 'eq', value: 'abc' });
});

test('value proxy builds a nested filter on document value', (t) => {
  t.deepEqual(stringifyParse(value.x.eq('abc')), { path: ['value', 'x'], operator: 'eq', value: 'abc' });
});

test('typedValue builds a filter on document value', (t) => {
  t.deepEqual(stringifyParse(typedValue<string>().eq('abc')), { path: ['value'], operator: 'eq', value: 'abc' });
});

test('typedValue proxy builds a nested filter on document value', (t) => {
  t.deepEqual(stringifyParse(typedValue<{ a: number }>().a.eq(6)), { path: ['value', 'a'], operator: 'eq', value: 6 });
});

test('typedValue proxy builds an array filter on document value', (t) => {
  t.deepEqual(stringifyParse(typedValue<string[]>()[0].eq('abc')), { path: ['value', '0'], operator: 'eq', value: 'abc' });
});

test('typedValue proxy builds a complex nested filter on document value', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<{ z: [{ x: boolean[] }] }>().z[0].x[5].eq(true)),
    { path: ['value', 'z', '0', 'x', '5'], operator: 'eq', value: true });
});

test('typedValue proxy supports optional fields', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<{ z?: number }>().z.exists()),
    { path: ['value', 'z'], operator: 'exists' });

  t.deepEqual(
    stringifyParse(typedValue<{ z?: number }>().z.eq(3)),
    { path: ['value', 'z'], operator: 'eq', value: 3 });
});

test('typedValue proxy supports optional array values', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<Array<number | undefined>>()[0].exists()),
    { path: ['value', '0'], operator: 'exists' });

  t.deepEqual(
    stringifyParse(typedValue<Array<number | undefined>>()[0].eq(3)),
    { path: ['value', '0'], operator: 'eq', value: 3 });
});

test('ne builds a gt filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<boolean>().ne(false)),
    { path: ['value'], operator: 'ne', value: false });
});

test('gt builds a gt filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<number>().gt(7)),
    { path: ['value'], operator: 'gt', value: 7 });
});

test('lt builds an lt filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<string>().lt('abc')),
    { path: ['value'], operator: 'lt', value: 'abc' });
});

test('gte builds a gte filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<number>().gte(7)),
    { path: ['value'], operator: 'gte', value: 7 });
});

test('lte builds an lte filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<string>().lte('abc')),
    { path: ['value'], operator: 'lte', value: 'abc' });
});

test('exists is available on non optional fields', (t) => {
  const val = typedValue<{ x: { y: string } }>();
  t.deepEqual(
    stringifyParse(val.x.exists()),
    { path: ['value', 'x'], operator: 'exists' });
  t.deepEqual(
    stringifyParse(val.x.y.exists()),
    { path: ['value', 'x', 'y'], operator: 'exists' });
});

test('match builds a match filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<string>().matches('abc')),
    { path: ['value'], operator: 'matches', value: { pattern: 'abc', caseInsensitive: false } });
  t.deepEqual(
    stringifyParse(typedValue<string>().matches('abc', true)),
    { path: ['value'], operator: 'matches', value: { pattern: 'abc', caseInsensitive: true } });
  t.deepEqual(
    stringifyParse(typedValue<string>().matches(/abc/)),
    { path: ['value'], operator: 'matches', value: { pattern: 'abc', caseInsensitive: false } });
  t.deepEqual(
    stringifyParse(typedValue<string>().matches(/abc/i)),
    { path: ['value'], operator: 'matches', value: { pattern: 'abc', caseInsensitive: true } });
});

test('startsWith builds a startsWith filter', (t) => {
  t.deepEqual(
    stringifyParse(typedValue<string>().startsWith('abc')),
    { path: ['value'], operator: 'startsWith', value: 'abc' });
});

test('all builds a valid filter', (t) => {
  t.deepEqual(
    stringifyParse(all(key.startsWith('/games/'), value.x.eq(5))),
    {
      operator: 'and',
      value: [
        { path: ['key'], operator: 'startsWith', value: '/games/' },
        { path: ['value', 'x'], operator: 'eq', value: 5 },
      ],
    });
});

test('all throws a TypeError if not given a filter', (t) => {
  t.throws(() => all('a' as any), TypeError);
});

test('all throws an IllegalArgumentError if not given any arguemnts', (t) => {
  t.throws(() => (all as any)(), IllegalArgumentError);
});

test('any builds a valid filter', (t) => {
  t.deepEqual(
    stringifyParse(any(key.startsWith('/games/'), value.y.gt(7))),
    {
      operator: 'or',
      value: [
        { path: ['key'], operator: 'startsWith', value: '/games/' },
        { path: ['value', 'y'], operator: 'gt', value: 7 },
      ],
    });
});

test('any throws a TypeError if not given a filter', (t) => {
  t.throws(() => any('a' as any), TypeError);
});

test('any throws an IllegalArgumentError if not given any arguemnts', (t) => {
  t.throws(() => (any as any)(), IllegalArgumentError);
});

test('not builds a valid filter', (t) => {
  t.deepEqual(
    stringifyParse(not(key.startsWith('/games/'))),
    {
      operator: 'not',
      value: { path: ['key'], operator: 'startsWith', value: '/games/' },
    });
});

test('not throws a TypeError if not given a filter', (t) => {
  t.throws(() => not('a' as any), TypeError);
});
