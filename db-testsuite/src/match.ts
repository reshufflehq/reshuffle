import anyTest, { TestInterface, Macro } from 'ava';
import { Document, Filter } from '@reshuffle/interfaces-koa-server/interfaces';
import { set, lensPath } from 'ramda';

type Operator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte';
type Scalar = string | number | boolean;

interface Context {
  match(doc: Document, filter: Filter): Promise<boolean>;
}

export const test = anyTest as TestInterface<Context>;

function *nest(testValue: any) {
  const paths = [[], ['a'], ['a', 0]];
  for (const path of paths) {
    const fullPath = ['value', ...path.map((x) => x.toString())];
    const value = path.length === 0 ? testValue : set(lensPath(path), testValue, {});
    yield [fullPath, value];
  }
}

const valueMatches: Macro<[any, Operator, Scalar], Context> = async (t, testValue, operator, matchValue) => {
  for (const [path, value] of nest(testValue)) {
    // TypeScript type system not strong enough to deduce this always
    // creates a legal filter, so just cast.
    const filter = { operator, path, value: matchValue } as Filter;
    t.true(await t.context.match({ key: 'abc', value }, filter));
  }
};

valueMatches.title = (providedTitle = '', testValue, operator, matchValue) =>
  `${providedTitle} ${operator}(${JSON.stringify(testValue)}, ${JSON.stringify(matchValue)})`;

const valueDoesntMatch: Macro<[any, Operator, Scalar], Context> = async (t, testValue, operator, matchValue) => {
  for (const [path, value] of nest(testValue)) {
    // TypeScript type system not strong enough to deduce this always
    // creates a legal filter, so just cast.
    const filter = { operator, path, value: matchValue } as Filter;
    t.false(await t.context.match({ key: 'abc', value }, filter));
  }
};
valueDoesntMatch.title = (providedTitle = '', testValue, operator, matchValue) =>
  `${providedTitle} !${operator}(${JSON.stringify(testValue)}, ${JSON.stringify(matchValue)})`;

const keyMatches: Macro<[string, Operator, string], Context> = async (t, testKey, operator, matchKey) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['key'], value: matchKey } as Filter;
  t.true(await t.context.match({ key: testKey, value: 17 }, filter));
};
keyMatches.title = (providedTitle = '', testKey, operator, matchKey) =>
  `${providedTitle} ${operator}(key ${JSON.stringify(testKey)}, key ${JSON.stringify(matchKey)})`;

const keyDoesntMatch: Macro<[string, Operator, string], Context> = async (t, testKey, operator, matchKey) => {
  // TypeScript type system not strong enough to deduce this always
  // creates a legal filter, so just cast.
  const filter = { operator, path: ['key'], value: matchKey } as Filter;
  t.false(await t.context.match({ key: testKey, value: 17 }, filter));
};

keyDoesntMatch.title = (providedTitle = '', testKey, operator, matchKey) =>
  `${providedTitle} !${operator}(key ${JSON.stringify(testKey)}, key ${JSON.stringify(matchKey)})`;

test('eq checks for strict equality', valueMatches, 3, 'eq', 3);
test('eq checks for strict equality', valueDoesntMatch, 3, 'eq', 2);
test('eq checks for strict equality', valueDoesntMatch, 3, 'eq', '3');
test('eq checks for strict equality', valueMatches, 'abc', 'eq', 'abc');
test('eq checks for strict equality', valueDoesntMatch, 'abc', 'eq', 'ab');
test('eq checks for strict equality', valueDoesntMatch, '3', 'eq', 3);
test('eq checks for strict equality', valueMatches, true, 'eq', true);
test('eq checks for strict equality', valueMatches, false, 'eq', false);
test('eq checks for strict equality', valueDoesntMatch, true, 'eq', 3);
test('eq checks for strict equality', valueDoesntMatch, false, 'eq', 0);

test('ne checks for strict equality', valueDoesntMatch, 3, 'ne', 3);
test('ne checks for strict equality', valueMatches, 3, 'ne', 2);
test('ne checks for strict equality', valueMatches, 3, 'ne', '3');
test('ne checks for strict equality', valueDoesntMatch, 'abc', 'ne', 'abc');
test('ne checks for strict equality', valueMatches, 'abc', 'ne', 'ab');
test('ne checks for strict equality', valueMatches, '3', 'ne', 3);
test('eq checks for strict equality', valueDoesntMatch, true, 'ne', true);
test('eq checks for strict equality', valueDoesntMatch, false, 'ne', false);
test('ne checks for strict equality', valueMatches, true, 'ne', 3);
test('ne checks for strict equality', valueMatches, false, 'ne', 0);

test('gt checks for same type', valueMatches, true, 'gt', false);
test('gt checks for same type', valueDoesntMatch, true, 'gt', true);
test('gt checks for same type', valueMatches, 3, 'gt', 2);
test('gt checks for same type', valueDoesntMatch, 3, 'gt', '2');
test('gt checks for same type', keyMatches, 'abc', 'gt', 'ab');
test('gt checks for same type', keyDoesntMatch, 'abc', 'gt', 2 as any);
test('gt checks for same type', valueMatches, 'abc', 'gt', 'ab');

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
const predicateHolds: Macro<[any, PredicateOp], Context> = async (t, testValue, operator) => {
  for (const [path, value] of nest(testValue)) {
    // TypeScript type system not strong enough to deduce this always
    // creates a legal filter, so just cast.
    const filter = { operator, path } as Filter;
    t.true(await t.context.match({ key: 'abc', value }, filter));
  }
};
predicateHolds.title = (providedTitle = '', testValue, operator) =>
  `${providedTitle} ${operator}(${JSON.stringify(testValue)})`;

const predicateFails: Macro<[any, PredicateOp], Context> = async (t, testValue, operator) => {
  for (const [path, value] of nest(testValue)) {
    // TypeScript type system not strong enough to deduce this always
    // creates a legal filter, so just cast.
    const filter = { operator, path } as Filter;
    t.false(await t.context.match({ key: 'abc', value }, filter));
  }
};
predicateFails.title = (providedTitle = '', testValue, operator) =>
  `${providedTitle} !${operator}(${JSON.stringify(testValue)})`;

test('exists checks for undefined', predicateHolds, null, 'exists');
test('exists checks for undefined', predicateHolds, 0, 'exists');
test('exists checks for undefined', predicateHolds, 'a', 'exists');
test('exists sanity', async (t) => {
  for (const path of [['value', 'a']]) {
    const filter = { operator: 'exists' as 'exists', path };
    t.false(await t.context.match({ key: 'abc', value: {} }, filter));
  }
  for (const path of [['key'], ['value']]) {
    const filter = { operator: 'exists' as 'exists', path };
    t.true(await t.context.match({ key: 'abc', value: {} }, filter));
  }
});

test('isNull checks for null', predicateHolds, null, 'isNull');
test('isNull checks for null', predicateFails, 0, 'isNull');
test('isNull checks for null', predicateFails, 'a', 'isNull');
test('isNull checks for null', predicateFails, {}, 'isNull');
test('isNull sanity', async (t) => {
  for (const path of [['key'], ['value'], ['value', 'a']]) {
    const filter = { operator: 'isNull' as 'isNull', path };
    t.false(await t.context.match({ key: 'abc', value: {} }, filter));
  }
});

const stringMatches: Macro<[any, RegExp], Context> = async (t, testValue, pattern) => {
  const caseInsensitive = pattern.flags.includes('i');
  for (const [path, value] of nest(testValue)) {
    const filter = { operator: 'matches' as 'matches', path, pattern: pattern.source, caseInsensitive };
    t.true(await t.context.match({ key: 'abc', value }, filter));
  }
};
stringMatches.title = (providedTitle = '', testValue, pattern) =>
  `${providedTitle} ${JSON.stringify(testValue)} =~ ${pattern})`;

const stringDoesntMatch: Macro<[any, RegExp], Context> = async (t, testValue, pattern) => {
  const caseInsensitive = pattern.flags.includes('i');
  for (const [path, value] of nest(testValue)) {
    const filter = { operator: 'matches' as 'matches', path, pattern: pattern.source, caseInsensitive };
    t.false(await t.context.match({ key: 'abc', value }, filter));
  }
};
stringDoesntMatch.title = (providedTitle = '', testValue, pattern) =>
  `${providedTitle} ${JSON.stringify(testValue)} !~ ${pattern})`;

test('matches matches key', async (t) => {
  const filter = { operator: 'matches' as 'matches', path: ['key'], pattern: '^ab', caseInsensitive: false };
  t.true(await t.context.match({ key: 'abc', value: 666 }, filter));
});

test('matches matches string', stringDoesntMatch, null, /abc/i);
test('matches matches string', stringDoesntMatch, 0, /abc/i);
test('matches matches string', stringMatches, 'abc', /abc/i);
test('matches matches string', stringMatches, 'ABC', /abc/i);
test('matches matches string', stringDoesntMatch, 'ABC', /abc/);

const startsWith: Macro<[any, string], Context> = async (t, testValue, matchValue) => {
  for (const [path, value] of nest(testValue)) {
    const filter = { operator: 'startsWith' as 'startsWith', path, value: matchValue };
    t.true(await t.context.match({ key: 'abc', value }, filter));
  }
};
startsWith.title = (providedTitle = '', testValue, value) =>
  `${providedTitle} ${testValue}.startsWith(${value})`;

const doesntStartWith: Macro<[any, string], Context> = async (t, testValue, matchValue) => {
  for (const [path, value] of nest(testValue)) {
    const filter = { operator: 'startsWith' as 'startsWith', path, value: matchValue };
    t.false(await t.context.match({ key: 'abc', value }, filter));
  }
};
doesntStartWith.title = (providedTitle = '', testValue, value) =>
  `${providedTitle} !${testValue}.startsWith(${value})`;

test('startsWith matches key', async (t) => {
  const filter = { operator: 'startsWith' as 'startsWith', path: ['key'], value: 'ab' };
  t.true(await t.context.match({ key: 'abc', value: 666 }, filter));
});

test('startsWith matches string', doesntStartWith, null, 'ab');
test('startsWith matches string', doesntStartWith, 0, 'ab');
test('startsWith matches string', startsWith, 'abc', 'ab');
test('startsWith matches string', doesntStartWith, 'ABC', 'ab');

const startsWithAb = { operator: 'startsWith' as 'startsWith', path: ['key'], value: 'Ab' };
const equalsAb = { operator: 'eq' as 'eq', path: ['key'], value: 'Ab' };
const equals0 = { operator: 'eq' as 'eq', path: ['value'], value: 0 };
const equals1 = { operator: 'eq' as 'eq', path: ['value'], value: 1 };

test('and applies all filters', async (t) => {
  const { match } = t.context;
  t.true(await match({ key: 'Abc', value: 0 }, { operator: 'and', filters: [startsWithAb, equals0] }));
  t.false(await match({ key: 'Abc', value: 0 }, { operator: 'and', filters: [startsWithAb, equals1] }));
  t.false(await match({ key: 'Abc', value: 0 }, { operator: 'and', filters: [equalsAb, equals0] }));
  t.false(await match({ key: 'Abc', value: 0 }, { operator: 'and', filters: [equalsAb, equals1] }));
});

test('any applies all filters', async (t) => {
  const { match } = t.context;
  t.true(await match({ key: 'Abc', value: 0 }, { operator: 'or', filters: [startsWithAb, equals0] }));
  t.true(await match({ key: 'Abc', value: 0 }, { operator: 'or', filters: [startsWithAb, equals1] }));
  t.true(await match({ key: 'Abc', value: 0 }, { operator: 'or', filters: [equalsAb, equals0] }));
  t.false(await match({ key: 'Abc', value: 0 }, { operator: 'or', filters: [equalsAb, equals1] }));
});

test('not negates a filter', async (t) => {
  const { match } = t.context;
  t.true(await match({ key: 'Abc', value: 0 }, { operator: 'not', filter: equalsAb }));
  t.false(await match({ key: 'Abc', value: 0 }, { operator: 'not', filter: startsWithAb }));
});
