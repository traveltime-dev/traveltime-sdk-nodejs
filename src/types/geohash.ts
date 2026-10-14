import {
  UnionOrIntersection,
} from './common';
import {
  GeoGridProperties,
  GeoGridRequestSearchBase,
  GeoGridResponse,
  GeohashCentroid,
} from './geogrid';

/** Fields shared by Geohash departure and arrival searches. */
export type GeohashRequestSearchBase = GeoGridRequestSearchBase<GeohashCentroid>

/** A search that leaves `coords` no earlier than `departure_time`. */
export type GeohashRequestDepartureSearch = GeohashRequestSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  departure_time: string;
}

/** A search that reaches `coords` no later than `arrival_time`. */
export type GeohashRequestArrivalSearch = GeohashRequestSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  arrival_time: string
}

/** Geohash request body. */
export type GeohashRequest = {
  /**
   * Geohash resolution (higher = smaller cells). Values can be in range [4, 9].
   * Higher resolutions allow a lower maximum `travel_time`:
   * https://docs.traveltime.com/api/reference/geohash#limits-of-resolution-and-traveltime.
   */
  resolution: number
  /** Travel time statistics to return for each cell. */
  properties: Array<GeoGridProperties>
  /** Searches based on departure time. Maximum 10. */
  departure_searches?: Array<GeohashRequestDepartureSearch>
  /** Searches based on arrival time. Maximum 10. */
  arrival_searches?: Array<GeohashRequestArrivalSearch>
  /** Unions of the cells of earlier searches. Maximum 10. */
  unions?: Array<UnionOrIntersection>
  /** Intersections of the cells of earlier searches. Maximum 10. */
  intersections?: Array<UnionOrIntersection>
}

/** Geohash response; cell ids are geohashes. */
export type GeohashResponse = GeoGridResponse
