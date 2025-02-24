import {
  UnionOrIntersection,
} from './common';
import {
  GeoGridProperties,
  GeoGridRequestSearchBase,
  GeoGridResponse,
} from './geoGrid';

export type GeohashRequestSearchBase = GeoGridRequestSearchBase

export type GeohashRequestDepartureSearch = GeohashRequestSearchBase & {
  departure_time: string;
}

export type GeohashRequestArrivalSearch = GeohashRequestSearchBase & {
  arrival_time: string
}

export type GeohashRequest = {
  /**
   * Values can be in range [1, 6]
   */
  resolution: number
  properties: Array<GeoGridProperties>
  departure_searches?: Array<GeohashRequestDepartureSearch>
  arrival_searches?: Array<GeohashRequestArrivalSearch>
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type GeohashResponse = GeoGridResponse
