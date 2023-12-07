import {
  LevelOfDetail,
  Coords,
  TransportationNoPtRequestCommons,
  PolygonsFilter,
} from './common';

export type DistanceMapSimple = {
  coords: Array<Coords>
  transportation: TransportationNoPtRequestCommons
  travelDistance: number
  leaveTime: string
  searchType?: 'arrive' | 'depart'
  level_of_detail?: LevelOfDetail
  /**
   * @deprecated Use {@link DistanceMapSimple.polygons_filter} instead.
   */
  single_shape?: boolean
  polygons_filter?: PolygonsFilter
  no_holes?: boolean
}
