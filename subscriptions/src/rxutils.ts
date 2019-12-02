import { MonoTypeOperatorFunction, Observable, OperatorFunction, pipe } from 'rxjs';
import { last, map, scan, takeUntil } from 'rxjs/operators';

interface StateAndOptionalOutput<T, O> {
  state: T;
  output?: O;
}

export type StateAndOutput<T, O> = Required<StateAndOptionalOutput<T, O>>;

export function mapWithState<T, I, O>(
  fn: (state: T, input: I) => StateAndOutput<T, O>, initialState: T
): OperatorFunction<I, O> {
  return pipe(
    scan(
      ({ state }: StateAndOptionalOutput<T, O>, input: I): StateAndOptionalOutput<T, O> => fn(state, input),
      { state: initialState, output: undefined }),
    map(({ output }) => output!),
  );
}

export function takeUntilLast<T, U>(obs$: Observable<U>): MonoTypeOperatorFunction<T> {
  return takeUntil(obs$.pipe(last(undefined, null)));
}
