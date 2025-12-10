import { UnionOrIntersection } from './common';
import {
  GeoGridFastRequestSearchBase,
  GeoGridProperties,
  GeoGridResponse,
  H3Centroid,
} from './geogrid';

export type H3FastRequestSearch = GeoGridFastRequestSearchBase<H3Centroid>

export type H3FastRequestArrivalSearch = {
  one_to_many?: Array<H3FastRequestSearch>,
  many_to_one?: Array<H3FastRequestSearch>
}

export type H3FastRequest = {
  /**
   * H3 resolution level (higher = more granular cells).
   * Limitations can be found here:
   * https://docs.traveltime.com/api/reference/h3-fast#limits-of-resolution-and-traveltime.
   */
  resolution: number
  properties: Array<GeoGridProperties>
  arrival_searches: H3FastRequestArrivalSearch
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type H3FastResponse = GeoGridResponse
