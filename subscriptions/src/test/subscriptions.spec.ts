import test from 'ava';
import * as im from 'immutable';
import { stub } from 'sinon';
import { concat, EMPTY, NEVER, of, Subject } from 'rxjs';
import { delay, take, tap, toArray } from 'rxjs/operators';
import { Patch, Version } from '@binaris/shift-interfaces/dist/subscriptions';
import {
  DEREGISTER,
  NonEmptyArray,
  poll,
  Poller,
  PollerInputWithObserver,
  pollReducer,
  publish,
  publishInputMapper,
  REGISTER,
  serverUpdates,
} from '../subscriptions';

// tslint:disable-next-line:variable-name
const Version = (major: number, minor: number): Version => [major, minor];
const eqVersion = (v1: Version, v2: Version): boolean => v1[0] === v2[0] && v1[1] === v2[1];
const mockPoller = () => stub<Parameters<Poller>, ReturnType<Poller>>().resolves([]);

test('poll polls when asked to register key', async (t) => {
  const poller = mockPoller();
  await of(
    { action: REGISTER, key: 'test', version: Version(1, 1) },
  ).pipe(
    poll(poller),
  ).toPromise();
  t.is(poller.args.length, 1);
  t.deepEqual(poller.args[0][0].toJS(), { test: Version(1, 1) });
});

test('poll stops polling when asked to deregister key', async (t) => {
  const poller = mockPoller();
  await of(
    { action: REGISTER, key: 'test1', version: Version(1, 1) },
    { action: REGISTER, key: 'test2', version: Version(1, 2) },
    { action: DEREGISTER, key: 'test1' },
  ).pipe(
    poll(poller),
  ).toPromise();
  t.deepEqual(poller.args.map(([versions]) => versions.toJS()), [
    { test1: Version(1, 1) },
    { test1: Version(1, 1), test2: Version(1, 2) },
    { test2: Version(1, 2) },
  ]);
});

test('poll updates version on poll result', async (t) => {
  const poller = mockPoller().resolves([['test', [{
    version: Version(1, 2),
    ops: [{ op: 'replace', path: '/root', value: 7 }],
  }]]]);
  await concat(
    of({ action: REGISTER, key: 'test', version: Version(1, 1) }),
    NEVER,
  ).pipe(
    poll(poller),
    take(2),
  ).toPromise();
  t.is(poller.args.length, 2);
  t.deepEqual(poller.args[0][0].toJS(), { test: Version(1, 1) });
  t.deepEqual(poller.args[1][0].toJS(), { test: Version(1, 2) });
});

test('pollReducer does not update version on poll result if already deregistered', (t) => {
  const output = pollReducer(
    im.Map({ test2: Version(1, 3) }),
    { action: 'update', keysToVersions: [['test', Version(1, 2)]] });
  t.deepEqual(output.toJS(), { test2: Version(1, 3) });
});

test('publish emits results on registered observer', async (t) => {
  const patches: NonEmptyArray<Patch> = [{ version: Version(1, 2), ops: [] }];
  const poller = mockPoller().callsFake(async (keysToVersions) => {
    await new Promise((resolve) => setImmediate(resolve));
    if (eqVersion(keysToVersions.get('test')!, Version(1, 1))) {
      return [['test', patches]];
    }
    return keysToVersions.map(() => []).toArray();
  });
  const subject = new Subject<NonEmptyArray<Patch>>();
  const [result] = await Promise.all([
    subject.pipe(
      take(1),
    ).toPromise(),
    concat(
      of({ action: REGISTER, key: 'test', version: Version(1, 1), observer: subject }),
      EMPTY.pipe(delay(1)),
    ).pipe(
      publish(poller),
    ).toPromise(),
  ]);

  t.is(result, patches);
});

test('publishInputMapper stops publishing results after deregister', (t) => {
  const patches: NonEmptyArray<Patch> = [{ version: [1, 2], ops: [] }];
  const subject = new Subject<NonEmptyArray<Patch>>();
  const deregister = { action: DEREGISTER, key: 'test' };
  const { state, output } = publishInputMapper(im.Map({ test: subject }), deregister);
  t.true(state.size === 0);
  t.is(output, deregister);
  t.notThrows(() => publishInputMapper(state, { action: 'publish', results: [['test', patches]] }));
});

test('serverUpdates emits initial state with empty patches', async (t) => {
  const subject = new Subject<PollerInputWithObserver>();
  const initialState = await serverUpdates('test',
    () => Promise.resolve({ version: Version(1, 1), value: {} }),
    subject).pipe(
    take(1),
  ).toPromise();
  t.deepEqual(initialState, { version: [1, 1], value: {}, patches: [] });
});

test('serverUpdates emits updated state from poller updates', async (t) => {
  const patches: NonEmptyArray<Patch> = [
    { version: [1, 2], ops: [{ op: 'replace', path: '/root', value: { a: 1 } }] },
    { version: [1, 3], ops: [{ op: 'add', path: '/root/b', value: 2 }] },
    { version: [1, 4], ops: [{ op: 'remove', path: '/root/a' }] },
  ];
  const subject = new Subject<PollerInputWithObserver>();
  const resolved = await Promise.all([
    subject.pipe(
      take(1),
      tap((input) => input.action === REGISTER && setImmediate(() => input.observer.next(patches))),
    ).toPromise(),
    serverUpdates('test', () => Promise.resolve({ version: Version(1, 1), value: {} }), subject).pipe(
      take(2),
    ).toPromise(),
  ]);
  t.deepEqual(resolved[1], { version: [1, 4], value: { b: 2 }, patches });
});

test('serverUpdates registers to poller', async (t) => {
  const subject = new Subject<PollerInputWithObserver>();
  const [input] = await Promise.all([
    subject.pipe(
      take(1),
    ).toPromise(),
    serverUpdates('test', () => Promise.resolve({ version: Version(1, 1), value: {} }), subject).pipe(
      take(1),
    ).toPromise(),
  ]);
  if (input.action !== REGISTER) {
    t.fail('Expected register to be emitted');
    throw new Error('Hi typescript compiler, the code path stops here');
  }
  const { observer, ...rest } = input;
  t.true(observer instanceof Subject);
  t.deepEqual(rest, { action: REGISTER, key: 'test', version: [1, 1] });
});

test('serverUpdates deregisters from poller on unsubscribe', async (t) => {
  const subject = new Subject<PollerInputWithObserver>();
  const [inputs] = await Promise.all([
    subject.pipe(
      take(2),
      toArray(),
    ).toPromise(),
    serverUpdates('test', () => Promise.resolve({ version: Version(1, 1), value: {} }), subject).pipe(
      take(1),
    ).toPromise(),
  ]);
  t.true(inputs.length === 2);
  t.is(inputs[0].action, REGISTER);
  t.deepEqual(inputs[1], { action: DEREGISTER, key: 'test' });
});

test('serverUpdates emits updated state on deletion and creation', async (t) => {
  const patches: NonEmptyArray<Patch> = [
    { version: [1, 1], ops: [{ op: 'replace', path: '/root', value: 1 }] },
    { version: [1, 2], ops: [{ op: 'replace', path: '/root', value: undefined }] },
    { version: [2, 1], ops: [{ op: 'replace', path: '/root', value: 2 }] },
  ];
  const subject = new Subject<PollerInputWithObserver>();
  const resolved = await Promise.all([
    subject.pipe(
      take(1),
      tap((input) => input.action === REGISTER && setImmediate(() => input.observer.next(patches))),
    ).toPromise(),
    serverUpdates<number | undefined>('test', () => Promise.resolve({
      version: Version(0, 0),
      value: undefined,
    }), subject).pipe(
      take(2),
    ).toPromise(),
  ]);
  t.deepEqual(resolved[1], { version: [2, 1], value: 2, patches });
});
