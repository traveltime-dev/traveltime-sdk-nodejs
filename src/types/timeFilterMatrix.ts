import { Coords } from './common';
import { TimeFilterRequestSearchBase } from './timeFilter';
import { TimeFilterFastRequestProperty, TimeFilterFastRequestTransportation } from './timeFilterFast';

/** Fields shared by the many-to-many matrix helpers. */
export type TimeFilterManyToManyMatrixRequestBase = {
  /** Maximum journey time in seconds. */
  travelTime: number
  /** Matrix rows: one search is made per point, with it as the search's single location. */
  coordsFrom: Array<Coords>
  /** Matrix columns: the many locations of every search. */
  coordsTo: Array<Coords>
}

/** Input of `manyToManyMatrixFast`. Each `coordsFrom` point is the departure of a `one_to_many` Time Filter (Fast) search. */
export type TimeFilterFastManyToManyMatrixRequest = TimeFilterManyToManyMatrixRequestBase & {
  /** Transportation mode and parameters. */
  transportation: TimeFilterFastRequestTransportation
  /**
   * Default value is `['travel_time']`
   */
  properties?: Array<TimeFilterFastRequestProperty>;
  /**
   * Maximum number of `coordsTo` points sent in one request; larger rows are split.
   * Default value is `100_000`.
   * Max value is `100_000`.
   */
  maxSearchesPerRequest?: number
}

/** Input of `manyToManyMatrix`, built on Time Filter. */
export type TimeFilterManyToManyMatrixRequest = TimeFilterManyToManyMatrixRequestBase & {
  /** Transportation mode and parameters. Only `type` is required. */
  transportation: TimeFilterRequestSearchBase['transportation']
  /**
   * Default value is `['travel_time']`
   */
  properties?: TimeFilterRequestSearchBase['properties'];
  /** Adjusts how the nearest roads are found. */
  snapping?: TimeFilterRequestSearchBase['snapping']
  /** Departure or arrival time, extended ISO-8601, depending on `searchType`. */
  leaveTime: string
  /**
   * Default `arrive`.
   * - `arrive` - journeys go from each `coordsTo` point to the `coordsFrom` point, arriving by `leaveTime`.
   * - `depart` - journeys go from the `coordsFrom` point to each `coordsTo` point, departing at `leaveTime`.
   */
  searchType?: 'arrive' | 'depart'
  /**
   * Maximum number of `coordsTo` points sent in one request; larger rows are split.
   * Defaults to and is capped at `100_000`, but Time Filter accepts at most `2_000`
   * location ids per search, so set `2_000` or less when `coordsTo` is larger.
   */
  maxSearchesPerRequest?: number
}

/** Result of `manyToManyMatrixFast`. */
export type TimeFilterFastManyToManyMatrixResponse = {
  /**
   * Travel times in seconds as `[coordsFrom index][coordsTo index]`; `-1` when unreachable, `null` when its request failed.
   * `undefined` unless `travel_time` was requested.
   */
  travelTimes: Array<Array<number | null>> | undefined
  /**
   * Distances in meters as `[coordsFrom index][coordsTo index]`; `-1` when unreachable or not returned, `null` when its request failed.
   * `undefined` unless `distance` was requested.
   */
  distances: Array<Array<number | null>> | undefined
  /** Errors of the requests that failed. */
  errors: Array<Error>
}

/** Result of `manyToManyMatrix`. */
export type TimeFilterManyToManyMatrixResponse = {
  /**
   * Travel times in seconds as `[coordsFrom index][coordsTo index]`; `-1` when unreachable, `null` when its request failed.
   * `undefined` unless `travel_time` was requested.
   */
  travelTimes: Array<Array<number | null>> | undefined
  /**
   * Distances in meters as `[coordsFrom index][coordsTo index]`; `-1` when unreachable or not returned, `null` when its request failed.
   * `undefined` unless `distance` was requested.
   */
  distances: Array<Array<number | null>> | undefined
  /** Errors of the requests that failed. */
  errors: Array<Error>
}
