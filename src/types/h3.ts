import {
  UnionOrIntersection,
} from './common';
import {
  GeoGridProperties,
  GeoGridRequestSearchBase,
  GeoGridResponse,
  H3Centroid,
} from './geogrid';

export type H3RequestSearchBase = GeoGridRequestSearchBase<H3Centroid>

export type H3RequestDepartureSearch = H3RequestSearchBase & {
  departure_time: string;
}

export type H3RequestArrivalSearch = H3RequestSearchBase & {
  arrival_time: string
}

export type H3Request = {
  /**
   * H3 resolution level (higher = more granular cells).
   * Limitations can be found here:
   * https://docs.traveltime.com/api/reference/h3#limits-of-resolution-and-traveltime.
   */
  resolution: number
  properties: Array<GeoGridProperties>
  departure_searches?: Array<H3RequestDepartureSearch>
  arrival_searches?: Array<H3RequestArrivalSearch>
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type H3Response = GeoGridResponse
