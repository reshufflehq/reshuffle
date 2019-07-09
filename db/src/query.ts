import { equals } from 'ramda';
import { IllegalArgumentError } from './errors';

type Key = string | number;
type Comparable = string | number | Date;
type Equatable = Comparable | boolean;

const filterSymbol = Symbol('shiftjs/filter');

interface BaseFilter {
  [filterSymbol]: true;
}

interface PathFilter extends BaseFilter {
  readonly path: string[];
}

interface EqFilter extends PathFilter {
  readonly operator: 'eq';
  readonly value: Equatable;
}

interface NeFilter extends PathFilter {
  readonly operator: 'ne';
  readonly value: Equatable;
}

interface ComparableFilter extends PathFilter {
  readonly value: Comparable;
}

interface GtFilter extends ComparableFilter {
  readonly operator: 'gt';
}

interface GteFilter extends ComparableFilter {
  readonly operator: 'gte';
}

interface LtFilter extends ComparableFilter {
  readonly operator: 'lt';
}

interface LteFilter extends ComparableFilter {
  readonly operator: 'lte';
}

interface ExistsFilter extends PathFilter {
  readonly operator: 'exists';
}

interface IsNullFilter extends PathFilter {
  readonly operator: 'isNull';
}

interface MatchesFilter extends PathFilter {
  readonly operator: 'matches';
  readonly pattern: string;
  readonly caseInsensitive: boolean;
}

interface StartsWithFilter extends PathFilter {
  readonly operator: 'startsWith';
  readonly value: string;
}

interface AndFilter extends BaseFilter {
  readonly operator: 'and';
  readonly filters: Filter[];
}

interface OrFilter extends BaseFilter {
  readonly operator: 'or';
  readonly filters: Filter[];
}

interface NotFilter extends BaseFilter {
  readonly operator: 'not';
  readonly filter: Filter;
}

export type Filter = EqFilter | NeFilter
  | GtFilter | GteFilter | LtFilter | LteFilter
  | ExistsFilter | IsNullFilter
  | MatchesFilter | StartsWithFilter
  | AndFilter | OrFilter | NotFilter;

const proxyHandler = {
  get(obj: Path, prop: string) {
    return prop in obj ? obj[prop as keyof Path] : obj.field(prop);
  },
};

class Path {
  constructor(protected readonly parts: string[]) {
  }

  public static proxied(parts: string[]): PathProxy {
    return new Proxy(new this(parts), proxyHandler) as any;
  }

  public field(k: Key): PathProxy {
    // When using proxy, paths will be converted to string, field() replicates this behavior
    return Path.proxied([...this.parts, k.toString()]);
  }

  public typedField<T>(k: Key): Doc<T> {
    return this.field(k) as any;
  }

  public eq(x: Equatable): EqFilter {
    return {
      [filterSymbol]: true,
      operator: 'eq',
      path: this.parts,
      value: x,
    };
  }

  public ne(x: Equatable): NeFilter {
    return {
      [filterSymbol]: true,
      operator: 'ne',
      path: this.parts,
      value: x,
    };
  }

  public gt(x: Comparable): GtFilter {
    return {
      [filterSymbol]: true,
      operator: 'gt',
      path: this.parts,
      value: x,
    };
  }

  public gte(x: Comparable): GteFilter {
    return {
      [filterSymbol]: true,
      operator: 'gte',
      path: this.parts,
      value: x,
    };
  }

  public lt(x: Comparable): LtFilter {
    return {
      [filterSymbol]: true,
      operator: 'lt',
      path: this.parts,
      value: x,
    };
  }

  public lte(x: Comparable): LteFilter {
    return {
      [filterSymbol]: true,
      operator: 'lte',
      path: this.parts,
      value: x,
    };
  }

  public exists(): ExistsFilter {
    return {
      [filterSymbol]: true,
      operator: 'exists',
      path: this.parts,
    };
  }

  public isNull(): IsNullFilter {
    return {
      [filterSymbol]: true,
      operator: 'isNull',
      path: this.parts,
    };
  }

  public matches(pattern: string, caseInsensitive?: boolean): MatchesFilter;

  public matches(pattern: RegExp): MatchesFilter;

  public matches(pattern: RegExp | string, caseInsensitive: boolean = false): MatchesFilter {
    if (typeof pattern === 'string') {
      return {
        [filterSymbol]: true,
        operator: 'matches',
        path: this.parts,
        pattern,
        caseInsensitive,
      };
    } else if (pattern instanceof RegExp) {
      return {
        [filterSymbol]: true,
        operator: 'matches',
        path: this.parts,
        pattern: pattern.source,
        caseInsensitive: pattern.flags.includes('i'),
      };
    }
    throw new TypeError('Expected pattern to be a RegExp or string');
  }

  public startsWith(prefix: string): StartsWithFilter {
    return {
      [filterSymbol]: true,
      operator: 'startsWith',
      path: this.parts,
      value: prefix,
    };
  }

  public asString(): StringPath {
    return this;
  }

  public asNumber(): NumberPath {
    return this;
  }

  public asDate(): DatePath {
    return this;
  }

  public asBoolean(): BooleanPath {
    return this;
  }

  public asObject<T>(): Doc<T> {
    return Path.proxied(this.parts) as any;
  }

  public asArray<T extends any[]>(): Doc<T> {
    return Path.proxied(this.parts) as any;
  }

  public asNull(): NullPath {
    return this;
  }
}

type PathProxy = Path & Record<Key, Path>;

interface CastablePath {
  asString(): StringPath;
  asNumber(): NumberPath;
  asDate(): DatePath;
  asBoolean(): BooleanPath;
  asObject<T>(): Doc<T>;
  asArray<T extends any[]>(): Doc<T>;
  asNull(): NullPath;
}

interface EquatablePath<T extends Equatable> extends CastablePath {
  eq(x: T): EqFilter;
  ne(x: T): NeFilter;
}

interface ComparablePath<T extends Comparable> extends EquatablePath<T> {
  gt(x: T): GtFilter;
  gte(x: T): GteFilter;
  lt(x: T): LtFilter;
  lte(x: T): LteFilter;
}

interface StringPath extends ComparablePath<string> {
  matches(pattern: string, caseInsensitive?: boolean): MatchesFilter;
  matches(pattern: RegExp): MatchesFilter;
  startsWith(prefix: string): StartsWithFilter;
}

type NumberPath = ComparablePath<number>;
type DatePath = ComparablePath<Date>;

type BooleanPath = EquatablePath<boolean>;

interface NullPath extends CastablePath {
  isNull(): IsNullFilter;
}

interface MaybePath extends CastablePath {
  exists(): Filter;
}

type Doc<T> = T extends Record<string, unknown> ? Required<{
  // technically type should have field(P) => Doc<T[P]> but that's not supported in typescript
  [P in keyof T]: Doc<T[P]> & MaybePath;
}>
  : T extends Array<infer U> ? { [idx: number]: Doc<U> & MaybePath }
  : T extends null ? NullPath
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
    if (!f[filterSymbol]) {
      throw new TypeError('Given filter is invalid');
    }
  }
}

export function all(...filters: NonEmptyArray<Filter>): AndFilter {
  checkFilters(...filters);
  return {
    [filterSymbol]: true,
    operator: 'and',
    filters,
  };
}

export function any(...filters: NonEmptyArray<Filter>): OrFilter {
  checkFilters(...filters);
  return {
    [filterSymbol]: true,
    operator: 'or',
    filters,
  };
}

export function not(f: Filter): NotFilter {
  checkFilters(f);
  return {
    [filterSymbol]: true,
    operator: 'not',
    filter: f,
  };
}

export type Direction = 'ASC' | 'DESC';
export const ASC: 'ASC' = 'ASC';
export const DESC: 'DESC' = 'DESC';

export type Order = [string[], Direction];

export class Query {
  protected constructor(
    protected readonly _filter: Filter,
    protected readonly _limit?: number,
    protected readonly _skip?: number,
    protected readonly _orderBy?: Order[],
  ) {}

  public filter(f: Filter): Query {
    return new Query(all(this._filter, f), this._limit, this._skip, this._orderBy);
  }

  public limit(l: number): Query {
    if (l < 1) {
      throw new IllegalArgumentError(`Given limit (${l}) is less than 1`);
    }
    if (this._limit !== undefined && l > this._limit) {
      throw new IllegalArgumentError(`Given limit (${l}) is greater than current limit (${this._limit})`);
    }
    return new Query(this._filter, l, this._skip, this._orderBy);
  }

  public skip(s: number): Query {
    return new Query(this._filter, this._limit, s, this._orderBy);
  }

  public orderBy(path: Path | Doc<any>, order: Direction = ASC): Query {
    const { parts } = (path as any);
    for (const [p] of (this._orderBy || [])) {
      if (equals(p, parts)) {
        throw new IllegalArgumentError(`Query already ordered by path: ${p}`);
      }
    }
    return new Query(this._filter, this._limit, this._skip, [...(this._orderBy || []), [parts, order]]);
  }

  public static fromFilter(f: Filter): Query {
    checkFilters(f);
    return new this(f);
  }

  public toJSON() {
    return {
      filter: this._filter,
      limit: this._limit,
      skip: this._skip,
      orderBy: this._orderBy,
    };
  }
}

export const filter = Query.fromFilter.bind(Query);
