import { UnionOrIntersection } from './common';
import {
  GeoGridFastRequestSearchBase,
  GeoGridProperties,
  GeoGridResponse,
  GeohashCentroid,
} from './geogrid';

/** A Geohash (Fast) search. */
export type GeohashFastRequestSearch = GeoGridFastRequestSearchBase<GeohashCentroid>

/** Geohash (Fast) searches, grouped by direction. */
export type GeohashFastRequestArrivalSearch = {
  /** Cells reachable from `coords`. Maximum 10. */
  one_to_many?: Array<GeohashFastRequestSearch>,
  /** Cells from which `coords` is reachable. Maximum 10. */
  many_to_one?: Array<GeohashFastRequestSearch>
}

/** Geohash (Fast) request body. */
export type GeohashFastRequest = {
  /**
   * Geohash resolution (higher = smaller cells). Values can be in range [4, 7].
   * Higher resolutions allow a lower maximum `travel_time`:
   * https://docs.traveltime.com/api/reference/geohash-fast#limits-of-resolution-and-traveltime.
   */
  resolution: number
  /** Travel time statistics to return for each cell. */
  properties: Array<GeoGridProperties>
  /** Searches, grouped by direction. */
  arrival_searches: GeohashFastRequestArrivalSearch
  /** Unions of the cells of earlier searches. Maximum 10. */
  unions?: Array<UnionOrIntersection>
  /** Intersections of the cells of earlier searches. Maximum 10. */
  intersections?: Array<UnionOrIntersection>
}

/** Geohash (Fast) response; cell ids are geohashes. */
export type GeohashFastResponse = GeoGridResponse
