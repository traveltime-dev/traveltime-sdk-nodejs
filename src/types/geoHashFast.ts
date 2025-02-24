import { UnionOrIntersection } from './common';
import { GeoGridFastRequestSearchBase, GeoGridProperties, GeoGridResponse } from './geoGrid';

export type GeohashFastRequestSearch = GeoGridFastRequestSearchBase

export type GeohashFastRequestArrivalSearch = {
  one_to_many?: Array<GeohashFastRequestSearch>,
  many_to_one?: Array<GeohashFastRequestSearch>
}

export type GeohashFastRequest = {
  /**
   * Values can be in range [1, 6]
   */
  resolution: number
  properties: Array<GeoGridProperties>
  arrival_searches: GeohashFastRequestArrivalSearch
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type GeohashFastResponse = GeoGridResponse
