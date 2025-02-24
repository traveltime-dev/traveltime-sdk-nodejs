import {
  Coords,
  RangeRequestNoMaxResults,
  Snapping,
  TransportationFast,
  TransportationRequestCommons,
} from './common';

export type GeoGridProperties = 'min' | 'max' | 'mean'
export type GeoGridRequestSearchProperty = 'is_only_walking';

export type GeoGridRequestSearchBase = Snapping & {
  id: string
  coords: Coords
  transportation: TransportationRequestCommons
  travel_time: number
  properties?: Array<GeoGridRequestSearchProperty>
  range?: RangeRequestNoMaxResults
}

export type GeoGridRequestDepartureSearch = GeoGridRequestSearchBase & {
  departure_time: string;
}

export type GeoGridRequestArrivalSearch = GeoGridRequestSearchBase & {
  arrival_time: string
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

export type GeoGridFastRequestSearchBase = Snapping & {
  id: string,
  coords: Coords,
  transportation: {
    type: TransportationFast
  },
  arrival_time_period : 'weekday_morning',
  travel_time: number,
}
