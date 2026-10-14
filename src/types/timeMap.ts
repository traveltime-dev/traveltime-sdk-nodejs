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

/** Extra properties a Time Map search can return about its shape. */
export type TimeMapRequestProperty = 'is_only_walking';

/** Fields shared by Time Map departure and arrival searches. */
export type TimeMapRequestSearchBase = Snapping & {
  /** Search id, used to match results and in unions/intersections. Must be unique among all searches. */
  id: string
  /** Departure location for a departure search, arrival location for an arrival search. */
  coords: Coords
  /** Transportation mode and parameters. Only `type` is required. */
  transportation: TransportationRequestCommons
  /** Maximum journey time in seconds. Maximum `14400` (4 hours) as standard. */
  travel_time: number
  /** Extra properties to return about the shape. */
  properties?: Array<TimeMapRequestProperty>
  /** Departure or arrival window; the returned shape combines every journey within it. Public transport modes only. */
  range?: RangeRequestNoMaxResults
  /** Level of detail of the returned shape; downgraded when `travel_time` is too long for it. */
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
   * Default: true
   * - `true` - returned shapes will not cover large nearby water bodies.
   * - `false` - returned shapes may cover nearby water bodies like large lakes, wide rivers and seas.
   */
  remove_water_bodies?: boolean
  /**
   * Distance in meters. Minimum `250`, default `1000`.
   * With `approximate_time_filter`, how far from the reached roads locations may count as reachable;
   * with `road_buffering`, how far the polygon is expanded outward from the reached roads.
   */
  buffer_distance?: number
}

/** A search that leaves `coords` no earlier than `departure_time`. */
export type TimeMapRequestDepartureSearch = TimeMapRequestSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  departure_time: string;
};

/** A search that reaches `coords` no later than `arrival_time`. */
export type TimeMapRequestArrivalSearch = TimeMapRequestSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  arrival_time: string
};

/** A union or intersection of the shapes of earlier searches. */
export type TimeMapRequestUnionOrIntersection = UnionOrIntersection

/** Time Map (isochrones) request body. */
export type TimeMapRequest = {
  /** Searches based on departure time. Maximum 10. */
  departure_searches?: Array<TimeMapRequestDepartureSearch>
  /** Searches based on arrival time. Maximum 10. */
  arrival_searches?: Array<TimeMapRequestArrivalSearch>
  /** Unions of the shapes of earlier searches. Maximum 10. */
  unions?: Array<TimeMapRequestUnionOrIntersection>
  /** Intersections of the shapes of earlier searches. Maximum 10. */
  intersections?: Array<TimeMapRequestUnionOrIntersection>
}

/** A single polygon with optional holes. */
export type TimeMapResponseShape = {
  /** Outer boundary of the polygon. */
  shell: Array<Coords>;
  /** Inner boundaries cut out of the polygon. */
  holes: Array<Array<Coords>>;
}

/** Properties returned about a shape. Only requested properties are present. */
export type TimeMapResponseProperties = {
  /** `true` when the shape was reached by walking only instead of the requested mode, e.g. no public transport nearby. */
  is_only_walking?: boolean;
}

/** GeoJSON feature properties. */
export type TimeMapResponseGeoJSONProperties = {
  /** Id of the search, union or intersection. */
  search_id: string;
}

/** The shape of one search, union or intersection. */
export type TimeMapResponseResult = {
  /** Id of the search, union or intersection. */
  search_id: string;
  /** Polygons making up the reachable area. */
  shapes: Array<TimeMapResponseShape>;
  /** Requested properties of the shape. */
  properties: TimeMapResponseProperties;
}

/** `application/json` response. */
export type TimeMapResponse = {
  /** One result per search, union and intersection, sorted by id. */
  results: Array<TimeMapResponseResult>
}

/** GeoJSON MultiPolygon geometry. */
export type TimeMapResponseGeoJSONPolygon = {
  /** GeoJSON geometry type. */
  type: 'MultiPolygon';
  /** Polygons as GeoJSON `[lng, lat]` positions. */
  coordinates: Position[][][];
}

/** GeoJSON feature for one search, union or intersection. */
export type TimeMapResponseGeoJSONFeature = {
  /** GeoJSON object type. */
  type: 'Feature';
  /** Reachable area. */
  geometry: TimeMapResponseGeoJSONPolygon;
  /** Identifies the search. */
  properties: TimeMapResponseGeoJSONProperties;
}

/** `application/geo+json` response. */
export type TimeMapResponseGeoJSON = {
  /** GeoJSON object type. */
  type: 'FeatureCollection';
  /** One feature per search, union and intersection. */
  features: Array<TimeMapResponseGeoJSONFeature>;
}

/** The shape of one search as Well-known text. */
export type TimeMapResponseVndWktResult = {
  /** Id of the search, union or intersection. */
  search_id: string;
  /** Shape in Well-known text (WKT). */
  shape: string;
  /** Requested properties of the shape. */
  properties: TimeMapResponseProperties;
}

/** `application/vnd.wkt+json` and `application/vnd.wkt-no-holes+json` response. */
export type TimeMapResponseVndWkt = {
  /** One result per search, union and intersection, sorted by id. */
  results: Array<TimeMapResponseVndWktResult>;
}

/** A group of bounding boxes and the envelope around them. */
export type TimeMapResponseVndBoundingBoxesBoundingBox = {
  /** Box enclosing all of `boxes`. */
  envelope: BoundingBox;
  /** Boxes covering the reachable area. */
  boxes: Array<BoundingBox>;
}

/** The shape of one search as bounding boxes. Holes are not included. */
export type TimeMapResponseVndBoundingBoxesResult = {
  /** Id of the search, union or intersection. */
  search_id: string;
  /** Bounding boxes of the shape. */
  bounding_boxes: Array<TimeMapResponseVndBoundingBoxesBoundingBox>;
  /** Requested properties of the shape. */
  properties: TimeMapResponseProperties;
}

/** `application/vnd.bounding-boxes+json` response. */
export type TimeMapResponseVndBoundingBoxes = {
  /** One result per search, union and intersection, sorted by id. */
  results: Array<TimeMapResponseVndBoundingBoxesResult>;
}
