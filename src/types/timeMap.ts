import {
  Coords,
  RangeRequestNoMaxResults,
  TransportationRequestCommons,
} from './common';

export type TimeMapRequestProperty = 'is_only_walking';
export declare type TimeMapRequestLevelOfDetailScaleType = 'simple' | 'coarse_grid';
export declare type TimeMapRequestLevelOfDetailLevel = 'lowest' | 'low' | 'medium' | 'high' | 'highest' | number;

export type RequestLevelOfDetail = {
  scale_type: TimeMapRequestLevelOfDetailScaleType;
  level: TimeMapRequestLevelOfDetailLevel;
  square_size: number;
}

export type TimeMapRequestSearchBase = {
  id: string
  coords: Coords
  transportation: TransportationRequestCommons
  travel_time: number
  properties?: Array<TimeMapRequestProperty>
  range?: RangeRequestNoMaxResults
  level_of_detail?: RequestLevelOfDetail
  single_shape?: boolean
  no_holes?: boolean
}

export type TimeMapRequestDepartureSearch = TimeMapRequestSearchBase & {
  departure_time: string;
};

export type TimeMapRequestArrivalSearch = TimeMapRequestSearchBase & {
  arrival_time: string
};

export type TimeMapRequestUnionOrIntersection = {
  id: string;
  search_ids: Array<string>;
}

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

export type TimeMapResponseResult = {
  search_id: string;
  shapes: Array<TimeMapResponseShape>;
  properties: TimeMapResponseProperties;
}

export type TimeMapResponse = {
  results: Array<TimeMapResponseResult>
}

export type Position = number[];

export type TimeMapResponseGeoJSONPolygon = {
  type: string;
  coordinates: Position[][][];
}

export type TimeMapResponseGeoJSONFeature = {
  type: string;
  geometry: Array<TimeMapResponseGeoJSONPolygon> | TimeMapResponseGeoJSONPolygon;
  properties: TimeMapResponseProperties;
}

export type TimeMapResponseGeoJSON = {
  type: string;
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

export type Envelope = {
  min_lat: number,
  max_lat: number,
  min_lng: number,
  max_lng: number,
}

export type Boxes = {
  min_lat: number,
  max_lat: number,
  min_lng: number,
  max_lng: number,
}

export type TimeMapResponseVndBoundingBoxesBoundingBox = {
  envelope: Envelope;
  boxes: Array<Boxes>;
}

export type TimeMapResponseVndBoundingBoxesResult = {
  search_id: string;
  bounding_boxes: Array<TimeMapResponseVndBoundingBoxesBoundingBox>;
  properties: TimeMapResponseProperties;
}

export type TimeMapResponseVndBoundingBoxes = {
  results: Array<TimeMapResponseVndBoundingBoxesResult>;
}
