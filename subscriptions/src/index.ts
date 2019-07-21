import { useEffect, useState, ReactElement } from 'react';
import { createRuntime } from '@binaris/shift-fetch-runtime';
import { SubscriptionManager } from './subscriptions';

const { poll, startPolling } = createRuntime(['poll', 'startPolling'], { filename: '@binaris/shift-db' });

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
