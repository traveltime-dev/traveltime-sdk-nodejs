import { UnionOrIntersection } from './common';
import {
  GeoGridFastRequestSearchBase,
  GeoGridProperties,
  GeoGridResponse,
  GeohashCentroid,
} from './geogrid';

export type GeohashFastRequestSearch = GeoGridFastRequestSearchBase<GeohashCentroid>

export type GeohashFastRequestArrivalSearch = {
  one_to_many?: Array<GeohashFastRequestSearch>,
  many_to_one?: Array<GeohashFastRequestSearch>
}

export type GeohashFastRequest = {
  /**
   * Allowed values differ based on `travel_time`
   */
  resolution: number
  properties: Array<GeoGridProperties>
  arrival_searches: GeohashFastRequestArrivalSearch
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type GeohashFastResponse = GeoGridResponse
