import {
  UnionOrIntersection,
} from './common';
import {
  GeoGridProperties,
  GeoGridRequestSearchBase,
  GeoGridResponse,
} from './geoGrid';

export type H3RequestSearchBase = GeoGridRequestSearchBase

export type H3RequestDepartureSearch = H3RequestSearchBase & {
  departure_time: string;
}

export type H3RequestArrivalSearch = H3RequestSearchBase & {
  arrival_time: string
}

export type H3Request = {
  /**
   * Values can be in range [1, 8]
   */
  resolution: number
  properties: Array<GeoGridProperties>
  departure_searches?: Array<H3RequestDepartureSearch>
  arrival_searches?: Array<H3RequestArrivalSearch>
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type H3Response = GeoGridResponse
