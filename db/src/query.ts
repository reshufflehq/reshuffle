import { IllegalArgumentError } from './errors';

type Key = string | number;
type Comparable = string | number | Date;
type Equatable = Comparable | boolean;

class Filter {
  constructor(
    protected readonly path: Key[] | undefined,
    protected readonly operator: string,
    protected readonly value?: any,
  ) {}
}

const proxyHandler = {
  get(obj: Path, prop: string) {
    return prop in obj ? obj[prop as keyof Path] : obj.field(prop);
  },
};

class Path {
  constructor(protected readonly parts: Key[]) {
  }

  static proxied(parts: Key[]): PathProxy {
    return new Proxy(new this(parts), proxyHandler) as any;
  }

  field(key: Key): PathProxy {
    // When using proxy, paths will be converted to string, field() replicates this behavior
    return Path.proxied([...this.parts, key.toString()]);
  }

  eq(x: Equatable): Filter {
    return new Filter(this.parts, 'eq', x);
  }

  ne(x: Equatable): Filter {
    return new Filter(this.parts, 'ne', x);
  }

  gt(x: Comparable): Filter {
    return new Filter(this.parts, 'gt', x);
  }

  gte(x: Comparable): Filter {
    return new Filter(this.parts, 'gte', x);
  }

  lt(x: Comparable): Filter {
    return new Filter(this.parts, 'lt', x);
  }

  lte(x: Comparable): Filter {
    return new Filter(this.parts, 'lte', x);
  }

  exists(): Filter {
    return new Filter(this.parts, 'exists');
  }

  matches(pattern: string, caseInsensitive?: boolean): Filter;

  matches(pattern: RegExp): Filter;

  matches(pattern: RegExp | string, caseInsensitive: boolean = false): Filter {
    if (typeof pattern === 'string') {
      return new Filter(this.parts, 'matches', { pattern, caseInsensitive });
    } else if (pattern instanceof RegExp) {
      return new Filter(this.parts, 'matches', { pattern: pattern.source, caseInsensitive: pattern.flags.includes('i') });
    }
    throw new TypeError('Expected pattern to be a RegExp or string');
  }

  startsWith(prefix: string): Filter {
    return new Filter(this.parts, 'startsWith', prefix);
  }
}

type PathProxy = Path & Record<Key, Path>;

interface EquatablePath<T extends Equatable> {
  eq(x: T): Filter;
  ne(x: T): Filter;
}

interface ComparablePath<T extends Comparable> extends EquatablePath<T> {
  gt(x: T): Filter;
  gte(x: T): Filter;
  lt(x: T): Filter;
  lte(x: T): Filter;
}

interface StringPath extends ComparablePath<string> {
  matches(pattern: string, caseInsensitive?: boolean): Filter;
  matches(pattern: RegExp): Filter;
  startsWith(prefix: string): Filter;
}

type NumberPath = ComparablePath<number>;
type DatePath = ComparablePath<Date>;

type BooleanPath = EquatablePath<boolean>;

interface MaybePath {
  exists(): Filter;
}

type Doc<T> = T extends Record<string, unknown> ? Required<{
  // technically type should have field(P) => Doc<T[P]> but that's not supported in typescript
  [P in keyof T]: Doc<T[P]> & MaybePath;
}>
  : T extends (infer U)[] ? { [idx: number]: Doc<U> & MaybePath }
  : T extends number ? NumberPath
  : T extends string ? StringPath
  : T extends boolean ? BooleanPath
  : T extends Date ? DatePath
  : never;

export function typedValue<T>() {
  return Path.proxied(['value']) as unknown as Doc<T>;
}

export const key = Path.proxied(['key']) as unknown as Doc<string>;
export const value = Path.proxied(['value']);

type NonEmptyArray<T> = [T, ...T[]];

function checkFilters(...filters: any[]) {
  if (filters.length === 0) {
    throw new IllegalArgumentError('Expected at least 1 filter');
  }
  for (const f of filters) {
    if (!(f instanceof Filter)) {
      throw new TypeError('Given filter is not an instance of Filter');
    }
  }
}

export function all(...filters: NonEmptyArray<Filter>): Filter {
  checkFilters(...filters);
  return new Filter(undefined, 'and', filters);
}

export function any(...filters: NonEmptyArray<Filter>): Filter {
  checkFilters(...filters);
  return new Filter(undefined, 'or', filters);
}

export function not(filter: Filter): Filter {
  checkFilters(filter);
  return new Filter(undefined, 'not', filter);
}
