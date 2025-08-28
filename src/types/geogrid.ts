import {
  Coords,
  RangeRequestNoMaxResults,
  Snapping,
  TransportationFast,
  TransportationRequestCommons,
} from './common';

export type GeoGridProperties = 'min' | 'max' | 'mean'
export type GeoGridRequestSearchProperty = 'is_only_walking';

export type GeoGridRequestSearchBase<Centroid> = Snapping & {
  id: string
  coords: Coords | Centroid
  transportation: TransportationRequestCommons
  travel_time: number
  properties?: Array<GeoGridRequestSearchProperty>
  /**
   * true (default) - returned cells will not cover large nearby water bodies
   *
   * false - returned cells may cover nearby water bodies like large lakes, wide rivers and seas
   */
  remove_water_bodies?: boolean
  range?: RangeRequestNoMaxResults
}

export type GeoGridCell = {
  id: string
  properties: {
    min?: number
    max?: number
    mean?: number
  }
}

export type GeoGridResult = {
  search_id: string
  cells: Array<GeoGridCell>
}

export type GeoGridResponse = {
  results: Array<GeoGridResult>
}

export type GeoGridFastRequestSearchBase<Centroid> = Snapping & {
  id: string,
  coords: Coords | Centroid,
  transportation: {
    type: TransportationFast
  },
  arrival_time_period : 'weekday_morning',
  travel_time: number,
}

export type GeohashCentroid = {
  geohash_centroid: string
}

export type H3Centroid = {
  h3_centroid: string
}
