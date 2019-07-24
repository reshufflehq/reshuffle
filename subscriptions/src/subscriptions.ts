import * as im from 'immutable';
import { from, merge, Observable, Observer, Subject } from 'rxjs';
import {
  startWith,
  concatMap,
  flatMap,
  filter,
  finalize,
  ignoreElements,
  scan,
  tap,
  map,
  publishReplay,
  refCount,
  share,
} from 'rxjs/operators';
import { applyReducer, Operation } from 'fast-json-patch';
import {
  KeyedPatches,
  Patch,
  Version,
  Versioned,
} from '@binaris/shift-interfaces/dist/subscriptions';
import { mapWithState, StateAndOutput, takeUntilLast } from './rxutils';

interface SubscriptionState<T> extends Versioned<T> {
  readonly patches?: Patch[];
}

type VersionedStateGetter<T> = (key: string) => Promise<Versioned<T>>;

export const REGISTER: 'register' = 'register';
export const DEREGISTER: 'deregister' = 'deregister';
const UPDATE: 'update' = 'update';

interface RegisterPollerInput {
  readonly action: typeof REGISTER;
  readonly key: string;
  readonly version: Version;
}
interface DeregisterPollerInput {
  readonly action: typeof DEREGISTER;
  readonly key: string;
}
interface UpdatePollerInput {
  readonly action: typeof UPDATE;
  readonly keysToVersions: Array<[string, Version]>;
}
type PollerInput = RegisterPollerInput | DeregisterPollerInput;

export type NonEmptyArray<T> = [T, ...T[]];

export function isNonEmptyArray<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}

export type KeyedNonEmptyPatch = [string, NonEmptyArray<Patch>];
export type KeyedNonEmptyPatches = NonEmptyArray<KeyedNonEmptyPatch>;
export type Poller = (keysToVersions: im.Map<string, Version>) => Promise<KeyedPatches>;

export function pollReducer(
  keysToVersions: im.Map<string, Version>,
  input: PollerInput | UpdatePollerInput,
): im.Map<string, Version> {
  switch (input.action) {
    case REGISTER:
      return keysToVersions.set(input.key, input.version);
    case DEREGISTER:
      return keysToVersions.delete(input.key);
    case UPDATE:
      // Only update existing keys in case key was updated after deregister
      return keysToVersions.withMutations((m) =>
        input.keysToVersions.forEach(([k, v]) => m.update(k, (prev) => prev === undefined ? prev : v))
      );
  }
}

export function poll(poller: Poller) {
  const subject = new Subject<UpdatePollerInput>();
  return (obs$: Observable<PollerInput>) => {
    const sharedObs$ = obs$.pipe(share());
    return merge(
      sharedObs$,
      subject.pipe(takeUntilLast(sharedObs$)),
    ).pipe(
      scan(pollReducer, im.Map()),
      filter((keysToVersions) => keysToVersions.size > 0),
      // TODO: backoff on error
      concatMap(poller),
      map((patchesPerKey) =>
        patchesPerKey.filter((keyedPatch): keyedPatch is KeyedNonEmptyPatch => isNonEmptyArray(keyedPatch[1]))),
      tap((patchesPerKey) => {
        const keysToVersions = patchesPerKey
          .map(([key, patches]): [string, Version] => [key, patches[patches.length - 1].version]);

        subject.next({ action: 'update', keysToVersions });
      }),
      filter(isNonEmptyArray),
    );
  };
}

interface RegisterPollerInputWithObserver extends RegisterPollerInput {
  readonly observer: Observer<NonEmptyArray<Patch>>;
}
interface PublishPollerInput {
  readonly action: 'publish';
  readonly results: KeyedNonEmptyPatches;
}
export type PollerInputWithObserver = RegisterPollerInputWithObserver | DeregisterPollerInput;

export function publishInputMapper(
  observers: im.Map<string, Observer<NonEmptyArray<Patch>>>,
  input: PollerInputWithObserver | PublishPollerInput,
): StateAndOutput<im.Map<string, Observer<NonEmptyArray<Patch>>>, PollerInputWithObserver | null> {
  switch (input.action) {
    case 'register':
      return {
        state: observers.set(input.key, input.observer),
        output: input,
      };
    case 'deregister':
      return {
        state: observers.delete(input.key),
        output: input,
      };
    case 'publish':
      // Side-effect
      for (const [key, patches] of input.results) {
        const observer = observers.get(key);
        if (observer !== undefined) {
          observer.next(patches);
        }
      }
      return {
        state: observers,
        output: null,
      };
  }
}

export function publish(poller: Poller) {
  const subject = new Subject<PublishPollerInput>();
  return (obs$: Observable<PollerInputWithObserver>) => {
    const sharedObs$ = obs$.pipe(share());
    return merge(
      sharedObs$,
      subject.pipe(takeUntilLast(sharedObs$)),
    ).pipe(
      mapWithState(publishInputMapper, im.Map()),
      filter((input): input is PollerInputWithObserver => input !== null),
      poll(poller),
      tap((results) => subject.next({ action: 'publish', results })),
      ignoreElements(),
    );
  };
}

export function serverUpdates<T>(
  key: string,
  getInitialState: VersionedStateGetter<T>,
  pollerInputSubject: Observer<PollerInputWithObserver>,
) {
  const patchesSubject = new Subject<Patch[]>();

  return from(getInitialState(key)).pipe(
    map((versioned): SubscriptionState<T> => ({ ...versioned, patches: [] })),
    tap(({ version }) => pollerInputSubject.next({ action: 'register', key, version, observer: patchesSubject })),
    flatMap((initialState) => patchesSubject.pipe(
      scan(({ value }, patches) => {
        return {
          version: patches[patches.length - 1].version,
          value: ([] as Operation[])
          .concat(...patches.map(({ ops }) => ops))
          .reduce<{ root: T }>(applyReducer, { root: value }).root,
          patches,
        };
      }, initialState),
      startWith(initialState),
    )),
    finalize(() => pollerInputSubject.next({ action: 'deregister', key })),
  );
}

export class SubscriptionManager {
  protected readonly subscriptions: Map<string, Observable<any>> = new Map();
  public readonly pollerInputSubject: Subject<PollerInputWithObserver> = new Subject();
  public readonly poller$: Observable<KeyedPatches>;

  constructor(protected readonly poller: Poller) {
    this.poller$ = this.pollerInputSubject.pipe(publish(poller));
  }

  public register<T>(key: string, getInitialState: VersionedStateGetter<T>): Observable<Versioned<T>> {
    const memoizedState$ = this.subscriptions.get(key);
    if (memoizedState$ !== undefined) {
      return memoizedState$;
    }

    const serverState$ = serverUpdates(key, getInitialState, this.pollerInputSubject);

    const state$ = serverState$.pipe(
      filter((versioned): versioned is Versioned<T> => versioned !== null),
      publishReplay(1),
      refCount(),
      finalize(() => {
        this.subscriptions.delete(key);
      })
    );

    this.subscriptions.set(key, state$);
    return state$;
  }
}
