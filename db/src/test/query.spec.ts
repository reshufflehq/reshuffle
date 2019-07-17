import test from 'ava';
import { IllegalArgumentError } from '../errors';
import { key, all, any, not, value, typedValue, filter } from '../query';
import { db as dbi } from '@binaris/shift-interfaces';

function stringifyThenParse(v: any) {
  return JSON.parse(JSON.stringify(v));
}

test('key builds a filter on document key', (t) => {
  t.deepEqual(stringifyThenParse(key.eq('abc')), { path: ['key'], operator: 'eq', value: 'abc' });
});

test('value builds a filter on document value', (t) => {
  t.deepEqual(stringifyThenParse(value.eq('abc')), { path: ['value'], operator: 'eq', value: 'abc' });
});

test('value.field() builds a nested filter on document value', (t) => {
  t.deepEqual(
    stringifyThenParse(value.field('a.b').eq('abc')),
    { path: ['value', 'a.b'], operator: 'eq', value: 'abc' });
});

test('value.field(number) casts path to string', (t) => {
  t.deepEqual(stringifyThenParse(value.field(7).eq('abc')), { path: ['value', '7'], operator: 'eq', value: 'abc' });
});

test('value.field(reserved field) generates a path', (t) => {
  t.deepEqual(stringifyThenParse(value.field('eq').eq('abc')), { path: ['value', 'eq'], operator: 'eq', value: 'abc' });
});

test('value proxy builds a nested filter on document value', (t) => {
  t.deepEqual(stringifyThenParse(value.x.eq('abc')), { path: ['value', 'x'], operator: 'eq', value: 'abc' });
});

test('typedField builds a filter on document value', (t) => {
  t.deepEqual(
    stringifyThenParse(value.typedField<string>('a').eq('abc')),
    { path: ['value', 'a'], operator: 'eq', value: 'abc' });
});

test('typedValue builds a filter on document value', (t) => {
  t.deepEqual(stringifyThenParse(typedValue<string>().eq('abc')), { path: ['value'], operator: 'eq', value: 'abc' });
});

test('typedValue proxy builds a nested filter on document value', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<{ a: number }>().a.eq(6)),
    { path: ['value', 'a'], operator: 'eq', value: 6 });
});

test('typedValue proxy builds an array filter on document value', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<string[]>()[0].eq('abc')),
    { path: ['value', '0'], operator: 'eq', value: 'abc' });
});

test('typedValue proxy builds a complex nested filter on document value', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<{ z: [{ x: boolean[] }] }>().z[0].x[5].eq(true)),
    { path: ['value', 'z', '0', 'x', '5'], operator: 'eq', value: true });
});

test('typedValue proxy supports optional fields', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<{ z?: number }>().z.exists()),
    { path: ['value', 'z'], operator: 'exists' });

  t.deepEqual(
    stringifyThenParse(typedValue<{ z?: number }>().z.eq(3)),
    { path: ['value', 'z'], operator: 'eq', value: 3 });
});

test('typedValue proxy supports optional array values', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<Array<number | undefined>>()[0].exists()),
    { path: ['value', '0'], operator: 'exists' });

  t.deepEqual(
    stringifyThenParse(typedValue<Array<number | undefined>>()[0].eq(3)),
    { path: ['value', '0'], operator: 'eq', value: 3 });
});

test('typedValue supports null', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<{ z: null }>().z.isNull()),
    { path: ['value', 'z'], operator: 'isNull' });

  t.deepEqual(
    stringifyThenParse(typedValue<{ z: number | null }>().z.as<null>().isNull()),
    { path: ['value', 'z'], operator: 'isNull' });

  t.deepEqual(
    stringifyThenParse(typedValue<{ z: number | null }>().z.as<number>().eq(3)),
    { path: ['value', 'z'], operator: 'eq', value: 3 });
});

test('ne builds a gt filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<boolean>().ne(false)),
    { path: ['value'], operator: 'ne', value: false });
});

test('gt builds a gt filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<number>().gt(7)),
    { path: ['value'], operator: 'gt', value: 7 });
});

test('lt builds an lt filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<string>().lt('abc')),
    { path: ['value'], operator: 'lt', value: 'abc' });
});

test('gte builds a gte filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<number>().gte(7)),
    { path: ['value'], operator: 'gte', value: 7 });
});

test('lte builds an lte filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<string>().lte('abc')),
    { path: ['value'], operator: 'lte', value: 'abc' });
});

test('exists is available on non optional fields', (t) => {
  const val = typedValue<{ x: { y: string } }>();
  t.deepEqual(
    stringifyThenParse(val.x.exists()),
    { path: ['value', 'x'], operator: 'exists' });
  t.deepEqual(
    stringifyThenParse(val.x.y.exists()),
    { path: ['value', 'x', 'y'], operator: 'exists' });
});

test('matches builds a match filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<string>().matches('abc')),
    { path: ['value'], operator: 'matches', pattern: 'abc', caseInsensitive: false });
  t.deepEqual(
    stringifyThenParse(typedValue<string>().matches('abc', true)),
    { path: ['value'], operator: 'matches', pattern: 'abc', caseInsensitive: true });
  t.deepEqual(
    stringifyThenParse(typedValue<string>().matches(/abc/)),
    { path: ['value'], operator: 'matches', pattern: 'abc', caseInsensitive: false });
  t.deepEqual(
    stringifyThenParse(typedValue<string>().matches(/abc/i)),
    { path: ['value'], operator: 'matches', pattern: 'abc', caseInsensitive: true });
});

test('matches throws when given unsupported flags', (t) => {
  t.throws(() => key.matches(/abc/g));
});

test('startsWith builds a startsWith filter', (t) => {
  t.deepEqual(
    stringifyThenParse(typedValue<string>().startsWith('abc')),
    { path: ['value'], operator: 'startsWith', value: 'abc' });
});

test('all builds a valid filter', (t) => {
  t.deepEqual(
    stringifyThenParse(all(key.startsWith('/games/'), value.x.eq(5))),
    {
      operator: 'and',
      filters: [
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
    stringifyThenParse(any(key.startsWith('/games/'), value.y.gt(7))),
    {
      operator: 'or',
      filters: [
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
    stringifyThenParse(not(key.startsWith('/games/'))),
    {
      operator: 'not',
      filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    });
});

test('not throws a TypeError if not given a filter', (t) => {
  t.throws(() => not('a' as any), TypeError);
});

test('filter builds a new query', (t) => {
  t.deepEqual(stringifyThenParse(filter(key.startsWith('/games/'))), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
  });
});

test('filter throws if not given a Filter', (t) => {
  t.throws(() => filter('abc' as any), TypeError);
});

test('Query.filter combines filters with logical AND', (t) => {
  t.deepEqual(stringifyThenParse(filter(key.startsWith('/games/')).filter(value.eq(7))), {
    filter: {
      operator: 'and',
      filters: [
        { path: ['key'], operator: 'startsWith', value: '/games/' },
        { path: ['value'], operator: 'eq', value: 7 },
      ],
    },
  });
});

test('Query.filter throws if not given a Filter', (t) => {
  const q = filter(key.eq('abc'));
  t.throws(() => q.filter('abc' as any), TypeError);
});

const baseQ = filter(key.startsWith('/games/'));
const limitQ = baseQ.limit(7);

test('Query.limit sets a limit', (t) => {
  t.deepEqual(stringifyThenParse(limitQ), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    limit: 7,
  });
});

test('Query.limit overrides if current limit > new limit l', (t) => {
  t.deepEqual(stringifyThenParse(limitQ.limit(6)), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    limit: 6,
  });
});

test('Query.limit does nothing if current limit = new limit', (t) => {
  t.deepEqual(stringifyThenParse(limitQ.limit(7)), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    limit: 7,
  });
});

test('Query.limit throws an IllegalArgumentError if increasing current limit', (t) => {
  t.throws(() => limitQ.limit(8), IllegalArgumentError);
});

test('Query.limit throws an IllegalArgumentError if setting limit to a value less than 1', (t) => {
  t.throws(() => limitQ.limit(0), IllegalArgumentError);
});

test('Query.skip sets skip', (t) => {
  t.deepEqual(stringifyThenParse(baseQ.skip(3)), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    skip: 3,
  });
});

test('Query.orderBy sets order', (t) => {
  t.deepEqual(stringifyThenParse(baseQ.orderBy(value.x)), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    orderBy: [[['value', 'x'], dbi.ASC]],
  });
});

test('Query.orderBy sets DESC order', (t) => {
  t.deepEqual(stringifyThenParse(baseQ.orderBy(value.x, dbi.DESC)), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    orderBy: [[['value', 'x'], dbi.DESC]],
  });
});

test('Query.orderBy sets secondary order', (t) => {
  t.deepEqual(stringifyThenParse(baseQ.orderBy(value.x).orderBy(key)), {
    filter: { path: ['key'], operator: 'startsWith', value: '/games/' },
    orderBy: [[['value', 'x'], dbi.ASC], [['key'], dbi.ASC]],
  });
});

test('Query.orderBy throws an IllegalArgumentError when ordering by same path twice', (t) => {
  t.throws(() => baseQ.orderBy(value.x).orderBy(value.x), IllegalArgumentError);
});
