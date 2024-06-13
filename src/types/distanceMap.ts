import {
  BoundingBox,
  Coords,
  LevelOfDetail,
  PolygonsFilter,
  Position,
  Snapping,
  TransportationNoPtRequestCommons,
} from './common';

export type DistanceMapRequestSearchBase = Snapping & {
  id: string
  coords: Coords
  transportation: TransportationNoPtRequestCommons
  travel_distance: number
  level_of_detail?: LevelOfDetail
  /**
   * @deprecated Use {@link DistanceMapRequestSearchBase.polygons_filter} instead.
   */
  single_shape?: boolean
  polygons_filter?: PolygonsFilter
  no_holes?: boolean
}

export type DistanceMapRequestDepartureSearch = DistanceMapRequestSearchBase & {
  departure_time: string;
};

export type DistanceMapRequestArrivalSearch = DistanceMapRequestSearchBase & {
  arrival_time: string
};

export type DistanceMapRequestUnionOrIntersection = {
  id: string;
  search_ids: Array<string>;
}

export type DistanceMapRequest = {
  departure_searches?: Array<DistanceMapRequestDepartureSearch>
  arrival_searches?: Array<DistanceMapRequestArrivalSearch>
  unions?: Array<DistanceMapRequestUnionOrIntersection>
  intersections?: Array<DistanceMapRequestUnionOrIntersection>
}

export type DistanceMapResponseShape = {
  shell: Array<Coords>;
  holes: Array<Array<Coords>>;
}

export type DistanceMapResponseProperties = Record<string, never>

export type DistanceMapResponseGeoJSONProperties = {
  search_id: string;
}

export type DistanceMapResponseResult = {
  search_id: string;
  shapes: Array<DistanceMapResponseShape>;
  properties: DistanceMapResponseProperties;
}

export type DistanceMapResponse = {
  results: Array<DistanceMapResponseResult>
}

export type DistanceMapResponseGeoJSONPolygon = {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type DistanceMapResponseGeoJSONFeature = {
  type: 'Feature';
  geometry: DistanceMapResponseGeoJSONPolygon;
  properties: DistanceMapResponseGeoJSONProperties;
}

export type DistanceMapResponseGeoJSON = {
  type: 'FeatureCollection';
  features: Array<DistanceMapResponseGeoJSONFeature>;
}

export type DistanceMapResponseVndWktResult = {
  search_id: string;
  shape: string;
  properties: DistanceMapResponseProperties
}

export type DistanceMapResponseVndWkt = {
  results: Array<DistanceMapResponseVndWktResult>;
}

export type DistanceMapResponseVndBoundingBoxesBoundingBox = {
  envelope: BoundingBox;
  boxes: Array<BoundingBox>;
}

export type DistanceMapResponseVndBoundingBoxesResult = {
  search_id: string;
  bounding_boxes: Array<DistanceMapResponseVndBoundingBoxesBoundingBox>;
  properties: DistanceMapResponseProperties;
}

export type DistanceMapResponseVndBoundingBoxes = {
  results: Array<DistanceMapResponseVndBoundingBoxesResult>;
}
