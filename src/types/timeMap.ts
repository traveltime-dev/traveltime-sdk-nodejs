import {
  BoundingBox,
  Coords,
  LevelOfDetail,
  PolygonsFilter,
  Position,
  RangeRequestNoMaxResults,
  Snapping,
  TransportationRequestCommons,
  UnionOrIntersection,
} from './common';

export type TimeMapRequestProperty = 'is_only_walking';

export type TimeMapRequestSearchBase = Snapping & {
  id: string
  coords: Coords
  transportation: TransportationRequestCommons
  travel_time: number
  properties?: Array<TimeMapRequestProperty>
  range?: RangeRequestNoMaxResults
  level_of_detail?: LevelOfDetail
  /**
   * @deprecated Use {@link TimeMapRequestSearchBase.polygons_filter} instead.
   */
  single_shape?: boolean
  polygons_filter?: PolygonsFilter
  no_holes?: boolean
  /**
   * Default: `approximate_time_filter`
   */
  render_mode?: 'approximate_time_filter' | 'road_buffering'
  /**
   * Default: true
   */
  remove_water_bodies?: boolean
  /**
   * @deprecated Use {@link TimeMapRequestSearchBase.snapping} instead.
   */
  snap_penalty?: 'enabled' | 'disabled'
}

export type TimeMapRequestDepartureSearch = TimeMapRequestSearchBase & {
  departure_time: string;
};

export type TimeMapRequestArrivalSearch = TimeMapRequestSearchBase & {
  arrival_time: string
};

export type TimeMapRequestUnionOrIntersection = UnionOrIntersection

export type TimeMapRequest = {
  departure_searches?: Array<TimeMapRequestDepartureSearch>
  arrival_searches?: Array<TimeMapRequestArrivalSearch>
  unions?: Array<TimeMapRequestUnionOrIntersection>
  intersections?: Array<TimeMapRequestUnionOrIntersection>
}

export type TimeMapResponseShape = {
  shell: Array<Coords>;
  holes: Array<Array<Coords>>;
}

export type TimeMapResponseProperties = {
  is_only_walking?: boolean;
}

export type TimeMapResponseGeoJSONProperties = {
  search_id: string;
}

export type TimeMapResponseResult = {
  search_id: string;
  shapes: Array<TimeMapResponseShape>;
  properties: TimeMapResponseProperties;
}

export type TimeMapResponse = {
  results: Array<TimeMapResponseResult>
}

export type TimeMapResponseGeoJSONPolygon = {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type TimeMapResponseGeoJSONFeature = {
  type: 'Feature';
  geometry: TimeMapResponseGeoJSONPolygon;
  properties: TimeMapResponseGeoJSONProperties;
}

export type TimeMapResponseGeoJSON = {
  type: 'FeatureCollection';
  features: Array<TimeMapResponseGeoJSONFeature>;
}

export type TimeMapResponseVndWktResult = {
  search_id: string;
  shape: string;
  properties: TimeMapResponseProperties;
}

export type TimeMapResponseVndWkt = {
  results: Array<TimeMapResponseVndWktResult>;
}

export type TimeMapResponseVndBoundingBoxesBoundingBox = {
  envelope: BoundingBox;
  boxes: Array<BoundingBox>;
}

export type TimeMapResponseVndBoundingBoxesResult = {
  search_id: string;
  bounding_boxes: Array<TimeMapResponseVndBoundingBoxesBoundingBox>;
  properties: TimeMapResponseProperties;
}

export type TimeMapResponseVndBoundingBoxes = {
  results: Array<TimeMapResponseVndBoundingBoxesResult>;
}
