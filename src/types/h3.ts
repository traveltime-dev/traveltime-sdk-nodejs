import {
  Coords,
  H3AndGeoHashProperties,
  RangeRequestNoMaxResults,
  Snapping,
  TransportationRequestCommons,
  UnionOrIntersection,
} from './common';

export type H3RequestProperty = 'is_only_walking';

export type H3RequestSearchBase = Snapping & {
  id: string
  coords: Coords
  transportation: TransportationRequestCommons
  travel_time: number
  properties?: Array<H3RequestProperty>
  range?: RangeRequestNoMaxResults
  /**
   * Default: true
   */
  remove_water_bodies?: boolean
}

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
  properties: Array<H3AndGeoHashProperties>
  departure_searches?: Array<H3RequestDepartureSearch>
  arrival_searches?: Array<H3RequestArrivalSearch>
  unions?: Array<UnionOrIntersection>
  intersections?: Array<UnionOrIntersection>
}

export type H3Cell = {
  id: string
  properties: {
    min?: number
    max?: number
    mean?: number
  }
}

export type H3Result = {
  search_id: string
  cells: Array<H3Cell>
}

export type H3Response = {
  results: Array<H3Result>
}
