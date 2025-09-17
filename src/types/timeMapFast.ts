import {
  Coords, LevelOfDetail, PolygonsFilter, Snapping, TransportationFastRequestCommons,
} from './common';

export type TimeMapFastRequestSearch = Snapping & {
  id: string,
  coords: Coords,
  transportation: TransportationFastRequestCommons
  arrival_time_period : 'weekday_morning',
  travel_time: number,
  level_of_detail?: LevelOfDetail
  polygons_filter?: PolygonsFilter
  no_holes?: boolean
  /**
   * Default: `approximate_time_filter`
   */
  render_mode?: 'approximate_time_filter' | 'road_buffering'
}

export type TimeMapFastRequestArrivalSearch = {
  one_to_many?: Array<TimeMapFastRequestSearch>,
  many_to_one?: Array<TimeMapFastRequestSearch>
}

export type TimeMapFastRequest = {
  arrival_searches: TimeMapFastRequestArrivalSearch
}
