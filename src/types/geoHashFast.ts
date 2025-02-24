import { UnionOrIntersection } from './common';
import { GeoGridFastRequestSearchBase, GeoGridProperties, GeoGridResponse } from './geoGrid';

export type GeoHashFastRequestSearch = GeoGridFastRequestSearchBase

export type GeoHashFastRequestArrivalSearch = {
  one_to_many?: Array<GeoHashFastRequestSearch>,
  many_to_one?: Array<GeoHashFastRequestSearch>
}

export type GeoHashFastRequest = {
  /**
   * Values can be in range [1, 6]
   */
  resolution: number
  properties: Array<GeoGridProperties>
  arrival_searches: GeoHashFastRequestArrivalSearch
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type GeoHashFastResponse = GeoGridResponse
