import test, { Macro } from 'ava';
import { testing } from '../db';
import { Filter } from '@binaris/shift-interfaces-koa-server/interfaces';

const { match } = testing;

type Operator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte';
type Scalar = string | number | boolean;

const valueMatches: Macro<[any, Operator, Scalar]> = (t, testValue, operator, matchValue) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['value'], value: matchValue } as Filter;
  t.true(match({ key: 'abc', value: testValue }, filter));
};
valueMatches.title = (providedTitle = '', testValue, operator, matchValue) =>
  `${providedTitle} ${operator}(${JSON.stringify(testValue)}, ${JSON.stringify(matchValue)})`;

const valueDoesntMatch: Macro<[any, Operator, Scalar]> = (t, testValue, operator, matchValue) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['value'], value: matchValue } as Filter;
  t.false(match({ key: 'abc', value: testValue }, filter));
};
valueDoesntMatch.title = (providedTitle = '', testValue, operator, matchValue) =>
  `${providedTitle} !${operator}(${JSON.stringify(testValue)}, ${JSON.stringify(matchValue)})`;

const keyMatches: Macro<[string, Operator, string]> = (t, testKey, operator, matchKey) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['key'], value: matchKey } as Filter;
  t.true(match({ key: testKey, value: 17 }, filter));
};
keyMatches.title = (providedTitle = '', testKey, operator, matchKey) =>
  `${providedTitle} ${operator}(key ${JSON.stringify(testKey)}, key ${JSON.stringify(matchKey)})`;

const keyDoesntMatch: Macro<[string, Operator, string]> = (t, testKey, operator, matchKey) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['key'], value: matchKey } as Filter;
  t.false(match({ key: testKey, value: 17 }, filter));
};
keyDoesntMatch.title = (providedTitle = '', testKey, operator, matchKey) =>
  `${providedTitle} !${operator}(key ${JSON.stringify(testKey)}, key ${JSON.stringify(matchKey)})`;

test('eq checks for strict equality', valueMatches, 3, 'eq', 3);
test('eq checks for strict equality', valueDoesntMatch, 3, 'eq', 2);
test('eq checks for strict equality', valueDoesntMatch, 3, 'eq', '3');

test('ne checks for strict equality', valueDoesntMatch, 3, 'ne', 3);
test('ne checks for strict equality', valueMatches, 3, 'ne', 2);
test('ne checks for strict equality', valueMatches, 3, 'ne', '3');

test('gt checks for same type', valueMatches, 3, 'gt', 2);
test('gt checks for same type', valueDoesntMatch, 3, 'gt', '2');
test('gt checks for same type', keyMatches, 'abc', 'gt', 'ab');
test('gt checks for same type', keyDoesntMatch, 'abc', 'gt', 2 as any);

test('lt checks for same type', valueMatches, 3, 'lt', 4);
test('lt checks for same type', valueDoesntMatch, 3, 'lt', '4');
test('lt checks for same type', keyMatches, 'abc', 'lt', 'abd');
test('lt checks for same type', keyDoesntMatch, 'abc', 'lt', 4 as any);

test('gte checks for same type', valueMatches, 3, 'gte', 2);
test('gte checks for same type', valueMatches, 3, 'gte', 3);
test('gte checks for same type', valueDoesntMatch, 3, 'gte', '2');
test('gte checks for same type', valueDoesntMatch, 3, 'gte', '3');
test('gte checks for same type', keyMatches, 'abc', 'gte', 'ab');
test('gte checks for same type', keyMatches, 'abc', 'gte', 'abc');
test('gte checks for same type', keyDoesntMatch, 'abc', 'gte', 2 as any);

test('lte checks for same type', valueMatches, 3, 'lte', 4);
test('lte checks for same type', valueMatches, 3, 'lte', 3);
test('lte checks for same type', valueDoesntMatch, 3, 'lte', '4');
test('lte checks for same type', valueDoesntMatch, 3, 'lte', '3');
test('lte checks for same type', keyMatches, 'abc', 'lte', 'abd');
test('lte checks for same type', keyMatches, 'abc', 'lte', 'abc');
test('lte checks for same type', keyDoesntMatch, 'abc', 'lte', 4 as any);

type PredicateOp = 'exists' | 'isNull';
const predicateHolds: Macro<[any, PredicateOp]> = (t, testValue, operator) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['value'] } as Filter;
  t.true(match({ key: 'abc', value: testValue }, filter));
};
predicateHolds.title = (providedTitle = '', testValue, operator) =>
  `${providedTitle} ${operator}(${JSON.stringify(testValue)})`;

const predicateFails: Macro<[any, PredicateOp]> = (t, testValue, operator) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['value'] } as Filter;
  t.false(match({ key: 'abc', value: testValue }, filter));
};
predicateFails.title = (providedTitle = '', testValue, operator) =>
  `${providedTitle} !${operator}(${JSON.stringify(testValue)})`;

test('exists checks for undefined', predicateHolds, null, 'exists');
test('exists checks for undefined', predicateHolds, 0, 'exists');
test('exists checks for undefined', predicateHolds, 'a', 'exists');
test('exists checks for undefined', predicateFails, undefined, 'exists');

test('isNull checks for null', predicateHolds, null, 'isNull');
test('isNull checks for null', predicateFails, undefined, 'isNull');
test('isNull checks for null', predicateFails, 0, 'isNull');
test('isNull checks for null', predicateFails, 'a', 'isNull');
test('isNull checks for null', predicateFails, {}, 'isNull');

const stringMatches: Macro<[any, RegExp]> = (t, testValue, pattern) => {
  const caseInsensitive = pattern.flags.includes('i');
  const filter = { operator: 'matches' as 'matches', path: ['value'], pattern: pattern.source, caseInsensitive };
  t.true(match({ key: 'abc', value: testValue }, filter));
};
stringMatches.title = (providedTitle = '', testValue, pattern) =>
  `${providedTitle} ${JSON.stringify(testValue)} =~ ${pattern})`;

const stringDoesntMatch: Macro<[any, RegExp]> = (t, testValue, pattern) => {
  const caseInsensitive = pattern.flags.includes('i');
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator: 'matches' as 'matches', path: ['value'], pattern: pattern.source, caseInsensitive };
  t.false(match({ key: 'abc', value: testValue }, filter));
};
stringDoesntMatch.title = (providedTitle = '', testValue, matchValue) =>
  `${providedTitle} ${JSON.stringify(testValue)} !~ ${matchValue})`;

test('matches matches string', stringDoesntMatch, null, /abc/i);
test('matches matches string', stringDoesntMatch, 0, /abc/i);
test('matches matches string', stringMatches, 'abc', /abc/i);
test('matches matches string', stringMatches, 'ABC', /abc/i);
test('matches matches string', stringDoesntMatch, 'ABC', /abc/);

const startsWith: Macro<[any, string]> = (t, testValue, value) => {
  const filter = { operator: 'startsWith' as 'startsWith', path: ['value'], value };
  t.true(match({ key: 'abc', value: testValue }, filter));
};
startsWith.title = (providedTitle = '', testValue, value) =>
  `${providedTitle} ${testValue}.startsWith(${value})`;

const doesntStartWith: Macro<[any, string]> = (t, testValue, value) => {
  const filter = { operator: 'startsWith' as 'startsWith', path: ['value'], value };
  t.false(match({ key: 'abc', value: testValue }, filter));
};
doesntStartWith.title = (providedTitle = '', testValue, value) =>
  `${providedTitle} !${testValue}.startsWith(${value})`;

test('startsWith matches string', doesntStartWith, null, 'ab');
test('startsWith matches string', doesntStartWith, 0, 'ab');
test('startsWith matches string', startsWith, 'abc', 'ab');
test('startsWith matches string', doesntStartWith, 'ABC', 'ab');

const startsWithAb = { operator: 'startsWith' as 'startsWith', path: ['key'], value: 'ab' };
const equalsAb = { operator: 'eq' as 'eq', path: ['key'], value: 'ab' }
const equals0 = { operator: 'eq' as 'eq', path: ['value'], value: 0 };
const equals1 = { operator: 'eq' as 'eq', path: ['value'], value: 1 };

test('and applies all filters', (t) => {
  t.true(match({ key: 'abc', value: 0 }, { operator: 'and', filters: [startsWithAb, equals0] }));
  t.false(match({ key: 'abc', value: 0 }, { operator: 'and', filters: [startsWithAb, equals1] }));
  t.false(match({ key: 'abc', value: 0 }, { operator: 'and', filters: [equalsAb, equals0] }));
  t.false(match({ key: 'abc', value: 0 }, { operator: 'and', filters: [equalsAb, equals1] }));
});

test('any applies all filters', (t) => {
  t.true(match({ key: 'abc', value: 0 }, { operator: 'or', filters: [startsWithAb, equals0] }));
  t.true(match({ key: 'abc', value: 0 }, { operator: 'or', filters: [startsWithAb, equals1] }));
  t.true(match({ key: 'abc', value: 0 }, { operator: 'or', filters: [equalsAb, equals0] }));
  t.false(match({ key: 'abc', value: 0 }, { operator: 'or', filters: [equalsAb, equals1] }));
});

test('not negates a filter', (t) => {
  t.true(match({ key: 'abc', value: 0 }, { operator: 'not', filter: equalsAb }));
  t.false(match({ key: 'abc', value: 0 }, { operator: 'not', filter: startsWithAb }));
});
