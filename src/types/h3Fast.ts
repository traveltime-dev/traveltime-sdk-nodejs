import { UnionOrIntersection } from './common';
import {
  GeoGridFastRequestSearchBase,
  GeoGridProperties,
  GeoGridResponse,
  H3Centroid,
} from './geogrid';

/** An H3 (Fast) search. */
export type H3FastRequestSearch = GeoGridFastRequestSearchBase<H3Centroid>

/** H3 (Fast) searches, grouped by direction. */
export type H3FastRequestArrivalSearch = {
  /** Cells reachable from `coords`. Maximum 10. */
  one_to_many?: Array<H3FastRequestSearch>,
  /** Cells from which `coords` is reachable. Maximum 10. */
  many_to_one?: Array<H3FastRequestSearch>
}

/** H3 (Fast) request body. */
export type H3FastRequest = {
  /**
   * H3 resolution level (higher = more granular cells), from `4` to `12`.
   * Limitations can be found here:
   * https://docs.traveltime.com/api/reference/h3-fast#limits-of-resolution-and-traveltime.
   */
  resolution: number
  /** Travel time statistics to return for each cell. */
  properties: Array<GeoGridProperties>
  /** Searches, grouped by direction. */
  arrival_searches: H3FastRequestArrivalSearch
  /** Unions of the cells of earlier searches. Maximum 10. */
  unions?: Array<UnionOrIntersection>
  /** Intersections of the cells of earlier searches. Maximum 10. */
  intersections?: Array<UnionOrIntersection>
}

/** H3 (Fast) response; cell ids are H3 indexes. */
export type H3FastResponse = GeoGridResponse
