export type Comparable = string | number | Date;
export type Equatable = Comparable | boolean;

export interface PathFilter {
  readonly path: string[];
}

export interface EqFilter extends PathFilter {
  readonly operator: 'eq';
  readonly value: Equatable;
}

export interface NeFilter extends PathFilter {
  readonly operator: 'ne';
  readonly value: Equatable;
}

export interface ComparableFilter extends PathFilter {
  readonly value: Comparable;
}

export interface GtFilter extends ComparableFilter {
  readonly operator: 'gt';
}

export interface GteFilter extends ComparableFilter {
  readonly operator: 'gte';
}

export interface LtFilter extends ComparableFilter {
  readonly operator: 'lt';
}

export interface LteFilter extends ComparableFilter {
  readonly operator: 'lte';
}

export interface ExistsFilter extends PathFilter {
  readonly operator: 'exists';
}

export interface IsNullFilter extends PathFilter {
  readonly operator: 'isNull';
}

export interface MatchesFilter extends PathFilter {
  readonly operator: 'matches';
  readonly pattern: string;
  readonly caseInsensitive: boolean;
}

export interface StartsWithFilter extends PathFilter {
  readonly operator: 'startsWith';
  readonly value: string;
}

export interface AndFilter {
  readonly operator: 'and';
  readonly filters: Filter[];
}

export interface OrFilter {
  readonly operator: 'or';
  readonly filters: Filter[];
}

export interface NotFilter {
  readonly operator: 'not';
  readonly filter: Filter;
}

export type Filter = EqFilter | NeFilter
  | GtFilter | GteFilter | LtFilter | LteFilter
  | ExistsFilter | IsNullFilter
  | MatchesFilter | StartsWithFilter
  | AndFilter | OrFilter | NotFilter;

export type Direction = 'ASC' | 'DESC';
export const ASC: 'ASC' = 'ASC';
export const DESC: 'DESC' = 'DESC';

export type Order = [string[], Direction];

export interface Query {
  filter: Filter;
  limit?: number;
  skip?: number;
  orderBy?: ReadonlyArray<Order>;
}
