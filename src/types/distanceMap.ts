import {
  BoundingBox,
  Coords,
  LevelOfDetail,
  PolygonsFilter,
  Position,
  Snapping,
  TransportationNoPtRequestCommons,
} from './common';

/** Fields shared by Distance Map departure and arrival searches. */
export type DistanceMapRequestSearchBase = Snapping & {
  /** Search id, used to match results and in unions/intersections. Must be unique among all searches. */
  id: string
  /** Departure location for a departure search, arrival location for an arrival search. */
  coords: Coords
  /** Transportation mode and parameters. Only `type` is required. */
  transportation: TransportationNoPtRequestCommons
  /**
   * Maximum journey distance in meters. Minimum `75`, maximum `800000` (800 km) as standard.
   * Journeys are still the fastest ones; distance only limits how far they reach.
   */
  travel_distance: number
  /** Level of detail of the returned shape. */
  level_of_detail?: LevelOfDetail
  /** Limits the polygons returned in a shape. */
  polygons_filter?: PolygonsFilter
  /** Remove holes from the returned polygons. Likely reduces accuracy. */
  no_holes?: boolean
  /**
   * Default: `approximate_time_filter`
   * - `approximate_time_filter` - the shape matches `time-filter` results as closely as possible.
   * - `road_buffering` - the shape looks as if the reached roads were painted over with a wide brush.
   */
  render_mode?: 'approximate_time_filter' | 'road_buffering'
  /**
   * Distance in meters. Minimum `250`, default `1000`.
   * With `approximate_time_filter`, how far from the reached roads locations may count as reachable;
   * with `road_buffering`, how far the polygon is expanded outward from the reached roads.
   */
  buffer_distance?: number
  /**
   * true (default) - returned shapes will not cover large nearby water bodies
   *
   * false - returned shapes may cover nearby water bodies like large lakes, wide rivers and seas
   */
  remove_water_bodies?: boolean
}

/** A search that leaves `coords` no earlier than `departure_time`. */
export type DistanceMapRequestDepartureSearch = DistanceMapRequestSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  departure_time: string;
};

/** A search that reaches `coords` no later than `arrival_time`. */
export type DistanceMapRequestArrivalSearch = DistanceMapRequestSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  arrival_time: string
};

/** A union or intersection of the shapes of earlier searches. */
export type DistanceMapRequestUnionOrIntersection = {
  /** Id of the result. Must be unique among all searches. */
  id: string;
  /** Ids of the searches whose shapes are combined. */
  search_ids: Array<string>;
}

/** Distance Map request body. */
export type DistanceMapRequest = {
  /** Searches based on departure time. Maximum 10. */
  departure_searches?: Array<DistanceMapRequestDepartureSearch>
  /** Searches based on arrival time. Maximum 10. */
  arrival_searches?: Array<DistanceMapRequestArrivalSearch>
  /** Unions of the shapes of earlier searches. Maximum 10. */
  unions?: Array<DistanceMapRequestUnionOrIntersection>
  /** Intersections of the shapes of earlier searches. Maximum 10. */
  intersections?: Array<DistanceMapRequestUnionOrIntersection>
}

/** A single polygon with optional holes. */
export type DistanceMapResponseShape = {
  /** Outer boundary of the polygon. */
  shell: Array<Coords>;
  /** Inner boundaries cut out of the polygon. */
  holes: Array<Array<Coords>>;
}

/** Distance Map has no requestable properties, so this is always empty. */
export type DistanceMapResponseProperties = Record<string, never>

/** GeoJSON feature properties. */
export type DistanceMapResponseGeoJSONProperties = {
  /** Id of the search, union or intersection. */
  search_id: string;
}

/** The shape of one search, union or intersection. */
export type DistanceMapResponseResult = {
  /** Id of the search, union or intersection. */
  search_id: string;
  /** Polygons making up the reachable area. */
  shapes: Array<DistanceMapResponseShape>;
  /** Always empty. */
  properties: DistanceMapResponseProperties;
}

/** `application/json` response. */
export type DistanceMapResponse = {
  /** One result per search, union and intersection, sorted by id. */
  results: Array<DistanceMapResponseResult>
}

/** GeoJSON MultiPolygon geometry. */
export type DistanceMapResponseGeoJSONPolygon = {
  /** GeoJSON geometry type. */
  type: 'MultiPolygon';
  /** Polygons as GeoJSON `[lng, lat]` positions. */
  coordinates: Position[][][];
}

/** GeoJSON feature for one search, union or intersection. */
export type DistanceMapResponseGeoJSONFeature = {
  /** GeoJSON object type. */
  type: 'Feature';
  /** Reachable area. */
  geometry: DistanceMapResponseGeoJSONPolygon;
  /** Identifies the search. */
  properties: DistanceMapResponseGeoJSONProperties;
}

/** `application/geo+json` response. */
export type DistanceMapResponseGeoJSON = {
  /** GeoJSON object type. */
  type: 'FeatureCollection';
  /** One feature per search, union and intersection. */
  features: Array<DistanceMapResponseGeoJSONFeature>;
}

/** The shape of one search as Well-known text. */
export type DistanceMapResponseVndWktResult = {
  /** Id of the search, union or intersection. */
  search_id: string;
  /** Shape in Well-known text (WKT). */
  shape: string;
  /** Always empty. */
  properties: DistanceMapResponseProperties
}

/** `application/vnd.wkt+json` and `application/vnd.wkt-no-holes+json` response. */
export type DistanceMapResponseVndWkt = {
  /** One result per search, union and intersection, sorted by id. */
  results: Array<DistanceMapResponseVndWktResult>;
}

/** A group of bounding boxes and the envelope around them. */
export type DistanceMapResponseVndBoundingBoxesBoundingBox = {
  /** Box enclosing all of `boxes`. */
  envelope: BoundingBox;
  /** Boxes covering the reachable area. */
  boxes: Array<BoundingBox>;
}

/** The shape of one search as bounding boxes. Holes are not included. */
export type DistanceMapResponseVndBoundingBoxesResult = {
  /** Id of the search, union or intersection. */
  search_id: string;
  /** Bounding boxes of the shape. */
  bounding_boxes: Array<DistanceMapResponseVndBoundingBoxesBoundingBox>;
  /** Always empty. */
  properties: DistanceMapResponseProperties;
}

/** `application/vnd.bounding-boxes+json` response. */
export type DistanceMapResponseVndBoundingBoxes = {
  /** One result per search, union and intersection, sorted by id. */
  results: Array<DistanceMapResponseVndBoundingBoxesResult>;
}
