import test from 'ava';
import { key, value, typedValue } from '../query';

test('key builds a filter on document key', (t) => {
  t.deepEqual(key.eq('abc').toJSON(), { path: ['key'], operator: 'eq', value: 'abc' });
});

test('value builds a filter on document value', (t) => {
  t.deepEqual(value.eq('abc').toJSON(), { path: ['value'], operator: 'eq', value: 'abc' });
});

test('value.field() builds a nested filter on document value', (t) => {
  t.deepEqual(value.field('a.b').eq('abc').toJSON(), { path: ['value', 'a.b'], operator: 'eq', value: 'abc' });
});

test('value.field(number) casts path to string', (t) => {
  t.deepEqual(value.field(7).eq('abc').toJSON(), { path: ['value', '7'], operator: 'eq', value: 'abc' });
});

test('value.field(reserved field) generates a path', (t) => {
  t.deepEqual(value.field('eq').eq('abc').toJSON(), { path: ['value', 'eq'], operator: 'eq', value: 'abc' });
});

test('value proxy builds a nested filter on document value', (t) => {
  t.deepEqual(value.x.eq('abc').toJSON(), { path: ['value', 'x'], operator: 'eq', value: 'abc' });
});

test('typedValue builds a filter on document value', (t) => {
  t.deepEqual(typedValue<string>().eq('abc').toJSON(), { path: ['value'], operator: 'eq', value: 'abc' });
});

test('typedValue proxy builds a nested filter on document value', (t) => {
  t.deepEqual(typedValue<{ a: number }>().a.eq(6).toJSON(), { path: ['value', 'a'], operator: 'eq', value: 6 });
});

test('typedValue proxy builds an array filter on document value', (t) => {
  t.deepEqual(typedValue<string[]>()[0].eq('abc').toJSON(), { path: ['value', '0'], operator: 'eq', value: 'abc' });
});

test('typedValue proxy builds a complex nested filter on document value', (t) => {
  t.deepEqual(
    typedValue<{ z: [{ x: boolean[] }] }>().z[0].x[5].eq(true).toJSON(),
    { path: ['value', 'z', '0', 'x', '5'], operator: 'eq', value: true });
});

test('ne builds a gt filter', (t) => {
  t.deepEqual(
    typedValue<boolean>().ne(false).toJSON(),
    { path: ['value'], operator: 'ne', value: false });
});

test('gt builds a gt filter', (t) => {
  t.deepEqual(
    typedValue<number>().gt(7).toJSON(),
    { path: ['value'], operator: 'gt', value: 7 });
});

test('lt builds an lt filter', (t) => {
  t.deepEqual(
    typedValue<string>().lt('abc').toJSON(),
    { path: ['value'], operator: 'lt', value: 'abc' });
});

test('gte builds a gte filter', (t) => {
  t.deepEqual(
    typedValue<number>().gte(7).toJSON(),
    { path: ['value'], operator: 'gte', value: 7 });
});

test('lte builds an lte filter', (t) => {
  t.deepEqual(
    typedValue<string>().lte('abc').toJSON(),
    { path: ['value'], operator: 'lte', value: 'abc' });
});
