import {
  RangeRequestNoMaxResults,
  LevelOfDetail,
  Coords,
  TransportationNoPtRequestCommons,
} from './common';

export type DistanceMapSimple = {
  coords: Array<Coords>
  transportation: TransportationNoPtRequestCommons
  travelDistance: number
  leaveTime: string
  searchType?: 'arrive' | 'depart'
  range?: RangeRequestNoMaxResults
  level_of_detail?: LevelOfDetail
  single_shape?: boolean
  no_holes?: boolean
}