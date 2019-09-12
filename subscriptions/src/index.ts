import { useEffect, useState, ReactElement } from 'react';
import { createRuntime } from '@reshuffle/fetch-runtime';
import { SubscriptionManager } from './subscriptions';

const { poll, startPolling } = createRuntime(['poll', 'startPolling'], { filename: '@reshuffle/db' });

export const subscriptionManager = new SubscriptionManager((keyedVersions) =>
  poll(keyedVersions.entrySeq().toArray()));

// TODO: expose this state instead of ignoring it
subscriptionManager.poller$.subscribe(() => undefined);

interface LoadingSubscriptionState {
  readonly loading: true;
}

interface ErrorSubscriptionState {
  readonly loading: false;
  readonly error: any;
}

interface DataSubscriptionState<T> {
  readonly loading: false;
  readonly data: T | undefined;
}

/**
 * The lifetime of a subscription goes through 3 different states.
 * LoadingSubscriptionState is the initial state, it never returns to it.
 * ErrorSubscriptionState is an absorbing state, it'll never recover.
 * DataSubscriptionState is the "normal" state, you're usually in this state.
 * Possible transitions are:
 * Loading -> Data
 * Loading -> Error
 * Data -> Data
 * Data -> Error
 */
type SubscriptionState<T> = LoadingSubscriptionState | ErrorSubscriptionState | DataSubscriptionState<T>;

export function useSubscription<T = any>(key: string): SubscriptionState<T> {
  const [state, setState] = useState<SubscriptionState<T>>({
    loading: true,
  });

  useEffect(() => {
    const sub = subscriptionManager.register<T>(key, startPolling).subscribe(
      ({ value }) => setState({ data: value, loading: false }),
      (error) => setState(() => ({ loading: false, error })),
    );
    return () => sub.unsubscribe();
  }, [key]);

  return state;
}

interface SubscriptionProps<T> {
  keyName: string;
  children: (arg: SubscriptionState<T>) => ReactElement<any>;
}

export function Subscription<T = any>({ keyName, children }: SubscriptionProps<T>) {
  const subState = useSubscription<T>(keyName);
  return children(subState);
}
