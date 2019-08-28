import { equals } from 'ramda';
import * as dbi from '@binaris/shift-interfaces-node-client/interfaces';
import { IllegalArgumentError } from './errors';

type Key = string | number;

const filterSymbol = Symbol('shiftjs/filter');

// Duplicated from ../../interfaces/src/db.ts
export type Comparable = string | number;
export type Equatable = Comparable | boolean;

// To avoid injection filters are marked during *construction*, but
// that marking is not required for use.  The DB code is on the other
// side of a serialization barrier.
export type Marked<T extends {}> = T & { [filterSymbol]: true };

export type EqFilter = Marked<dbi.EqFilter>;
export type NeFilter = Marked<dbi.NeFilter>;
export type GtFilter = Marked<dbi.GtFilter>;
export type GteFilter = Marked<dbi.GteFilter>;
export type LtFilter = Marked<dbi.LtFilter>;
export type LteFilter = Marked<dbi.LteFilter>;
export type ExistsFilter = Marked<dbi.ExistsFilter>;
export type IsNullFilter = Marked<dbi.IsNullFilter>;
export type MatchesFilter = Marked<dbi.MatchesFilter>;
export type StartsWithFilter = Marked<dbi.StartsWithFilter>;

export type Direction = dbi.Direction;
export type Order = dbi.Order;
export const ASC = dbi.Direction.ASC;
export const DESC = dbi.Direction.DESC;

interface AndFilter extends Marked<dbi.AndFilter> {
  readonly filters: Filter[];
}
interface OrFilter extends Marked<dbi.OrFilter> {
  readonly filters: Filter[];
}
interface NotFilter extends Marked<dbi.NotFilter> {
  readonly filter: Filter;
}

export type Filter = EqFilter | NeFilter
  | GtFilter | GteFilter | LtFilter | LteFilter
  | ExistsFilter | IsNullFilter
  | MatchesFilter | StartsWithFilter
  | AndFilter | OrFilter | NotFilter;

const proxyHandler = {
  get(obj: Path, prop: string) {
    // Known properties such as `field` and `eq` are used as defined, unknown properties are used as fields.
    return prop in obj ? obj[prop as keyof Path] : obj.field(prop);
  },
};

class Path {
  constructor(protected readonly parts: string[]) {
  }

  public static proxied(parts: string[]): PathProxy {
    return new Proxy(new this(parts), proxyHandler) as any;
  }

  /**
   * Returns a subpath at given key.
   * @param key - object key or array index
   * @return - subpath of document
   */
  public field(k: Key): PathProxy {
    // When using proxy, paths will be converted to string, field() replicates this behavior
    return Path.proxied([...this.parts, k.toString()]);
  }

  /**
   * Returns a subpath at given key.
   * Has a template parameter for improved type safety when using typescript.
   * @param key - object key or array index
   * @return - subpath of document
   */
  public typedField<T>(k: Key): Doc<T> {
    return this.field(k) as any;
  }

  /**
   * Equals
   * @param x - value for comparison
   * @return - a filter
   */
  public eq(x: Equatable): EqFilter {
    return {
      [filterSymbol]: true,
      operator: 'eq',
      path: this.parts,
      value: x,
    };
  }

  /**
   * Not equals
   * @param x - value for comparison
   * @return - a filter
   */
  public ne(x: Equatable): NeFilter {
    return {
      [filterSymbol]: true,
      operator: 'ne',
      path: this.parts,
      value: x,
    };
  }

  /**
   * Greater than
   * @param x - value for comparison
   * @return - a filter
   */
  public gt(x: Comparable): GtFilter {
    return {
      [filterSymbol]: true,
      operator: 'gt',
      path: this.parts,
      value: x,
    };
  }

  /**
   * Greater than or equals
   * @param x - value for comparison
   * @return - a filter
   */
  public gte(x: Comparable): GteFilter {
    return {
      [filterSymbol]: true,
      operator: 'gte',
      path: this.parts,
      value: x,
    };
  }

  /**
   * Less than
   * @param x - value for comparison
   * @return - a filter
   */
  public lt(x: Comparable): LtFilter {
    return {
      [filterSymbol]: true,
      operator: 'lt',
      path: this.parts,
      value: x,
    };
  }

  /**
   * Less than or equals
   * @param x - value for comparison
   * @return - a filter
   */
  public lte(x: Comparable): LteFilter {
    return {
      [filterSymbol]: true,
      operator: 'lte',
      path: this.parts,
      value: x,
    };
  }

  /**
   * Does path exist?
   * @return - a filter
   */
  public exists(): ExistsFilter {
    return {
      [filterSymbol]: true,
      operator: 'exists',
      path: this.parts,
    };
  }

  /**
   * Is value at path null?
   * @return - a filter
   */
  public isNull(): IsNullFilter {
    return {
      [filterSymbol]: true,
      operator: 'isNull',
      path: this.parts,
    };
  }

  /**
   * String matches pattern.
   * @param pattern regular expression
   * @param caseInsensitive should the check be case insensitive?
   * @return - a filter
   */
  public matches(pattern: string, caseInsensitive?: boolean): MatchesFilter;

  /**
   * String matches pattern.
   * @param pattern - regular expression, if the RegExp object has the 'i' flag, perform a case insensitive match.
   * @return - a filter
   */
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
      if (/[^i]/.test(pattern.flags)) {
        throw new TypeError('Only /i RegExp flag supported');
      }
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

  /**
   * String starts with prefix
   * @return - a filter
   */
  public startsWith(prefix: string): StartsWithFilter {
    return {
      [filterSymbol]: true,
      operator: 'startsWith',
      path: this.parts,
      value: prefix,
    };
  }

  /**
   * Casts to a specific doc type. Use for typed paths with typescript.
   * @return - a filter
   */
  public as<T>(): Doc<T> {
    return Path.proxied(this.parts) as any;
  }
}

type PathProxy = Path & Record<Key, Path>;

interface CastablePath {
  as<T>(): Doc<T>;
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
  : never;

export function typedValue<T>() {
  return Path.proxied(['value']) as unknown as Doc<T>;
}

export const key = Path.proxied(['key']) as unknown as Doc<string>;
export const value = Path.proxied(['value']);

type NonEmptyArray<T> = [T, ...T[]];

function checkFilters(...filters: any[]): void {
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

export interface QueryData extends dbi.Query {
  filter: Filter;
}

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
    for (const { path: p } of (this._orderBy || [])) {
      if (equals(p, parts)) {
        throw new IllegalArgumentError(`Query already ordered by path: ${p}`);
      }
    }
    return new Query(this._filter, this._limit, this._skip,
                     [...(this._orderBy || []), { path: parts, direction: order }]);
  }

  public static fromFilter(f: Filter): Query {
    checkFilters(f);
    return new this(f);
  }

  public toJSON(): QueryData {
    return this.getParts();
  }

  public getParts(): QueryData {
    return {
      filter: this._filter,
      limit: this._limit,
      skip: this._skip,
      orderBy: this._orderBy,
    };
  }
}

export const filter = Query.fromFilter.bind(Query);
