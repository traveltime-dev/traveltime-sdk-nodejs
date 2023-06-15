import {
  RangeRequestNoMaxResults, LevelOfDetail, Coords, TransportationRequestCommons,
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
