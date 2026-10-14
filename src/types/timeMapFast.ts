import {
  Coords, LevelOfDetail, PolygonsFilter, Snapping, TransportationFastRequestCommons, UnionOrIntersection,
} from './common';

/** A Time Map (Fast) search. */
export type TimeMapFastRequestSearch = Snapping & {
  /** Search id, used to match results and in unions/intersections. Must be unique among all searches. */
  id: string,
  /** Departure location in `one_to_many`, arrival location in `many_to_one`. */
  coords: Coords,
  /** Transportation mode and parameters. */
  transportation: TransportationFastRequestCommons
  /** Time period the journeys are computed for. Only `weekday_morning` is available. */
  arrival_time_period : 'weekday_morning',
  /** Maximum journey time in seconds. Maximum `10800` (3 hours) as standard. */
  travel_time: number,
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
   * Distance in meters. Minimum `250`, default `1000`.
   * With `approximate_time_filter`, how far from the reached roads locations may count as reachable;
   * with `road_buffering`, how far the polygon is expanded outward from the reached roads.
   */
  buffer_distance?: number
}

/** Time Map (Fast) searches, grouped by direction. */
export type TimeMapFastRequestArrivalSearch = {
  /** Reachable area for journeys departing from `coords`. Maximum 10. */
  one_to_many?: Array<TimeMapFastRequestSearch>,
  /** Reachable area for journeys arriving at `coords`. Maximum 10. */
  many_to_one?: Array<TimeMapFastRequestSearch>
}

/** Time Map (Fast) request body. */
export type TimeMapFastRequest = {
  /** Searches, grouped by direction. */
  arrival_searches: TimeMapFastRequestArrivalSearch
  /** Unions of the shapes of earlier searches. Maximum 10. */
  unions?: Array<UnionOrIntersection>
  /** Intersections of the shapes of earlier searches. Maximum 10. */
  intersections?: Array<UnionOrIntersection>
}
