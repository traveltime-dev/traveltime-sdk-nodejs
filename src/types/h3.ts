import {
  UnionOrIntersection,
} from './common';
import {
  GeoGridProperties,
  GeoGridRequestSearchBase,
  GeoGridResponse,
  H3Centroid,
} from './geogrid';

/** Fields shared by H3 departure and arrival searches. */
export type H3RequestSearchBase = GeoGridRequestSearchBase<H3Centroid>

/** A search that leaves `coords` no earlier than `departure_time`. */
export type H3RequestDepartureSearch = H3RequestSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  departure_time: string;
}

/** A search that reaches `coords` no later than `arrival_time`. */
export type H3RequestArrivalSearch = H3RequestSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  arrival_time: string
}

/** H3 request body. */
export type H3Request = {
  /**
   * H3 resolution level (higher = more granular cells), from `4` to `12`.
   * Limitations can be found here:
   * https://docs.traveltime.com/api/reference/h3#limits-of-resolution-and-traveltime.
   */
  resolution: number
  /** Travel time statistics to return for each cell. */
  properties: Array<GeoGridProperties>
  /** Searches based on departure time. Maximum 10. */
  departure_searches?: Array<H3RequestDepartureSearch>
  /** Searches based on arrival time. Maximum 10. */
  arrival_searches?: Array<H3RequestArrivalSearch>
  /** Unions of the cells of earlier searches. Maximum 10. */
  unions?: Array<UnionOrIntersection>
  /** Intersections of the cells of earlier searches. Maximum 10. */
  intersections?: Array<UnionOrIntersection>
}

/** H3 response; cell ids are H3 indexes. */
export type H3Response = GeoGridResponse
