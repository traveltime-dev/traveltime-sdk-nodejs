import {
  UnionOrIntersection,
} from './common';
import {
  GeoGridProperties,
  GeoGridRequestSearchBase,
  GeoGridResponse,
} from './geoGrid';

export type GeoHashRequestSearchBase = GeoGridRequestSearchBase

export type GeoHashRequestDepartureSearch = GeoHashRequestSearchBase & {
  departure_time: string;
}

export type GeoHashRequestArrivalSearch = GeoHashRequestSearchBase & {
  arrival_time: string
}

export type GeoHashRequest = {
  /**
   * Values can be in range [1, 6]
   */
  resolution: number
  properties: Array<GeoGridProperties>
  departure_searches?: Array<GeoHashRequestDepartureSearch>
  arrival_searches?: Array<GeoHashRequestArrivalSearch>
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type GeoHashResponse = GeoGridResponse
