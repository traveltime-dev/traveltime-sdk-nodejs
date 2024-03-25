import {
  Coords, LevelOfDetail, PolygonsFilter, TransportationFast,
} from './common';

export type TimeMapFastRequestSearch = {
  id: string,
  coords: Coords,
  transportation: {
    type: TransportationFast
  },
  arrival_time_period : 'weekday_morning',
  travel_time: number,
  level_of_detail?: LevelOfDetail
  polygons_filter?: PolygonsFilter
  no_holes?: boolean
}

export type TimeMapFastRequestArrivalSearch = {
  one_to_many?: Array<TimeMapFastRequestSearch>,
  many_to_one?: Array<TimeMapFastRequestSearch>
}

export type TimeMapFastRequest = {
  arrival_searches: TimeMapFastRequestArrivalSearch
}
