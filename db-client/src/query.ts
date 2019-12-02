import { equals } from 'ramda';
import * as dbi from '@reshuffle/interfaces-node-client/interfaces';
import { IllegalArgumentError } from './errors';

type Key = string | number;

const filterSymbol = Symbol('db/filter');

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
/** Sort in ascending order (default) */
export const ASC = dbi.Direction.ASC;
/** Sort in descending order */
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

/**
 * An expression matching some documents in the store.  Filters are
 * combinations of _terms_: a condition on a [[Path]].  Start building
 * a filter by specifying a Path using [[key]] or a path down the
 * object from [[value]], then convert that Path to a Filter term
 * using one of the Path comparison operators.
 *
 * Filters can only be constructed from these utility functions, to
 * help protect from query injection.
 *
 * ## Example: everything in the database
 *
 * ```js
 * const everythingFilter = Q.key.startsWith('');
 * ```
 *
 * ## Example: all users, who we decide to store on keys starting `user:`
 *
 * ```js
 * const usersFilter = Q.key.startsWith('user:');
 * ```
 *
 * ## Example: all documents with field `.personal.age` at most 3
 *
 * ```js
 * const toddlersFilter = Q.value.personal.age.lte(3);
 * ```
 *
 * ## Example: all users whose locale is `fr_CA`
 *
 * ```js
 * const frenchCanadianFilter = Q.all(
 *   Q.key.startsWith('user:'),
 *   Q.value.primaryLanguage.eq('fr_CA'),
 * );
 * ```
 */
export type Filter = EqFilter | NeFilter |
GtFilter | GteFilter | LtFilter | LteFilter |
ExistsFilter | IsNullFilter |
MatchesFilter | StartsWithFilter |
AndFilter | OrFilter | NotFilter;

const proxyHandler = {
  get(obj: Path, prop: string) {
    // Known properties such as `field` and `eq` are used as defined, unknown properties are used as fields.
    return prop in obj ? obj[prop as keyof Path] : obj.field(prop);
  },
};

// Marked "export" only for documentation purposes.  User could should
// probably use Q.key and/or Q.value, instead.
/** @external */
export class Path {
  /** Use [[value]] or [[key]] methods, instead. */
  constructor(protected readonly parts: string[]) {
  }

  public static proxied(parts: string[]): PathProxy {
    return new Proxy(new this(parts), proxyHandler) as any;
  }

  /**
   * Returns a subpath at given key.  The syntax `path.name` uses a
   * proxy and is equivalent to `path.field('name')`.  Use this
   * function to access reserved words or variable components.
   *
   * @param k Object key or array index
   * @return subpath of document
   */
  public field(k: Key): PathProxy {
    // When using proxy, paths will be converted to string, field() replicates this behavior
    return Path.proxied([...this.parts, k.toString()]);
  }

  /**
   * Returns a subpath at given key.  The syntax `path.name` uses a
   * proxy and is equivalent to `path.typedField('name')` when using
   * TypeScript.  Use this function to access reserved words or
   * variable components.
   *
   * @typeparam T Type of suboject at k.
   * @param k Object key or array index
   * @return subpath of document
   */
  public typedField<T>(k: Key): Doc<T> {
    return this.field(k) as any;
  }

  /**
   * Equals comparison
   * @param x Value for comparison
   * @return a filter
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
   * Not equals comparison
   * @param x Value for comparison
   * @return a filter
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
   * Greater than comparison
   * @param x Value for comparison
   * @return a filter
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
   * Greater than or equals comparison
   * @param x Value for comparison
   * @return a filter
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
   * Less than comparison
   * @param x Value for comparison
   * @return a filter
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
   * Less than or equals comparison
   * @param x Value for comparison
   * @return a filter
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
   * Does path exist comparison
   * @return a filter
   */
  public exists(): ExistsFilter {
    return {
      [filterSymbol]: true,
      operator: 'exists',
      path: this.parts,
    };
  }

  /**
   * Is value at path null comparison
   * @return a filter
   */
  public isNull(): IsNullFilter {
    return {
      [filterSymbol]: true,
      operator: 'isNull',
      path: this.parts,
    };
  }

  public matches(pattern: string, caseInsensitive?: boolean): MatchesFilter;

  public matches(pattern: RegExp): MatchesFilter;

  /**
   * String matches pattern comparison
   *
   * @param pattern Regular expression string or RegExp.  Honours
   *   (only) the `i` flag, if pattern is a RegExp and has it.
   *
   * @param caseInsensitive If true, uses case insensitive comparison (default `false`)
   *
   * @return a filter
   */
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
   * String starts with prefix comparison
   * @return a filter
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
   * Casts to a specific doc type. Use for typed paths with TypeScript.
   *
   * @return a filter
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

/**
 * A [[Path]] referring to the key of an object in the store.
 */
export const key = Path.proxied(['key']) as unknown as Doc<string>;

/**
 * A [[Path]] referring to the value of a document in the store.
 * Access the fields of the document using either proxy syntax
 * `Q.value.user.id` or field syntax `Q.value.field('user')`.
 */
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

/**
 * AND operator on filters.
 * @param filters An array of filters.
 * @return A filter that matches elements that match _all_ of the filters.
 */
export function all(...filters: NonEmptyArray<Filter>): AndFilter {
  checkFilters(...filters);
  return {
    [filterSymbol]: true,
    operator: 'and',
    filters,
  };
}

/**
 * OR operator on filters.
 * @param filters An array of filters.
 * @return A filter that matches elements that match _any one_ of the filters.
 */
export function any(...filters: NonEmptyArray<Filter>): OrFilter {
  checkFilters(...filters);
  return {
    [filterSymbol]: true,
    operator: 'or',
    filters,
  };
}

/**
 * NOT operator on filters.
 * @param filter A filter to negate.
 * @return A filter that matches only elements that do _not_ match filter.
 */
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

/**
 * A database query.  Supports a fluent interface; any query can be
 * used as a base query and changed to be more restrictive.
 */
export class Query {
  protected constructor(
    protected readonly _filter: Filter,
    protected readonly _limit?: number,
    protected readonly _skip?: number,
    protected readonly _orderBy?: Order[],
  ) {}

  /**
   * @param f A Filter to add to the query.
   * @return A new query.  It will match all elements that match both the
   *   filter of the existing query and f.
   */
  public filter(f: Filter): Query {
    return new Query(all(this._filter, f), this._limit, this._skip, this._orderBy);
  }

  /**
   * @param l Maximal number of elements to return.  Must be smaller than current limit.
   * @return A new query.  It will return the first l elements that the existing query
   *   would.
   */
  public limit(l: number): Query {
    if (l < 1) {
      throw new IllegalArgumentError(`Given limit (${l}) is less than 1`);
    }
    if (this._limit !== undefined && l > this._limit) {
      throw new IllegalArgumentError(`Given limit (${l}) is greater than current limit (${this._limit})`);
    }
    return new Query(this._filter, l, this._skip, this._orderBy);
  }

  /**
   * @param s New number of elements to skip
   * @return A new query.  It will return the same elements that the existing query
   *   would, skipping a different number of queries at the start.
   */
  public skip(s: number): Query {
    return new Query(this._filter, this._limit, s, this._orderBy);
  }

  /**
   * @param path Additional path for sorting
   * @param order DESC to sort in descending order (default ASC)
   * @return A new query.  It will return the same elements at the existing query,
   *   adding path as an additional field for sorting.
   */
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

  /**
   * Constructs a query from a filter.
   *
   * @param f Filter for query.
   * @return A Query with filter f, no limits or skip, and no ordering.
   */
  public static fromFilter(f: Filter): Query {
    checkFilters(f);
    return new this(f);
  }

  /**
   * @return A serializable representation of this query.
   */
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

/**
 * Starts building a query from a filter.  Construct all [[Query]]
 * objects starting from this.
 *
 * ## Example: Query returning pages of 25 users
 *
 * ```js
 * const usersQuery = db.Q.filter(db.Q.key.startsWith('user:'));
 *
 * async function makeUserPageQuery(pageNum, pageSize = 25) {
 *   return usersQuery.limit(pageSize).skip(pageNum * pageSize);
 * }
 * ```
 *
 * @param filter [[Filter]] that this query will use
 * @return A query that will return all documents matching filter
 */
export function filter(f: Filter) {
  return Query.fromFilter(f);
}
