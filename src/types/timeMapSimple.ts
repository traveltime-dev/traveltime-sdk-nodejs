import {
  RangeRequestNoMaxResults, LevelOfDetail, Coords, TransportationRequestCommons, TransportationFast, PolygonsFilter,
} from './common';
import { TimeMapRequestProperty } from './timeMap';

export type TimeMapSimple = {
  coords: Array<Coords>
  transportation: TransportationRequestCommons
  travelTime: number
  leaveTime: string
  searchType?: 'arrive' | 'depart'
  properties?: Array<TimeMapRequestProperty>
  range?: RangeRequestNoMaxResults
  level_of_detail?: LevelOfDetail
  /**
   * @deprecated Use {@link TimeMapSimple.polygons_filter} instead.
   */
  single_shape?: boolean
  polygons_filter?: PolygonsFilter
  no_holes?: boolean
}

export type TimeMapFastSimple = {
  coords: Array<Coords>
  transport: TransportationFast
  travelTime: number
  /**
   * Default value is `one_to_many`
   */
  searchType?: 'one_to_many' | 'many_to_one'
  level_of_detail?: LevelOfDetail
}
