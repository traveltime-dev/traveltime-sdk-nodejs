import {
  RangeRequestNoMaxResults, LevelOfDetail, Coords, TransportationRequestCommons, TransportationFast,
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
  single_shape?: boolean
  no_holes?: boolean
}

export type TimeMapFastSimple = {
  coords: Array<Coords>
  transport: TransportationFast
  travelTime: number
  searchType?: 'one_to_many' | 'many_to_one'
  level_of_detail?: LevelOfDetail
}
