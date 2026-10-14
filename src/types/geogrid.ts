import {
  Coords,
  RangeRequestNoMaxResults,
  Snapping,
  TransportationFastRequestCommons,
  TransportationRequestCommons,
} from './common';

/** Travel time statistics a grid search can return for each cell. */
export type GeoGridProperties = 'min' | 'max' | 'mean'

/** Fields shared by H3 and Geohash departure and arrival searches. */
export type GeoGridRequestSearchBase<Centroid> = Snapping & {
  /** Search id, used to match results and in unions/intersections. Must be unique among all searches. */
  id: string
  /** Search location: either `lat`/`lng`, or the centroid of a cell. */
  coords: Coords | Centroid
  /** Transportation mode and parameters. Only `type` is required. */
  transportation: TransportationRequestCommons
  /** Maximum journey time in seconds. The maximum depends on `resolution`. */
  travel_time: number
  /**
   * true (default) - returned cells will not cover large nearby water bodies
   *
   * false - returned cells may cover nearby water bodies like large lakes, wide rivers and seas
   */
  remove_water_bodies?: boolean
  /** Departure or arrival window; cells cover every journey within it. Public transport modes only. */
  range?: RangeRequestNoMaxResults
}

/** A reachable cell. */
export type GeoGridCell = {
  /** Cell id: an H3 index or a geohash. */
  id: string
  /** Requested travel time statistics of the cell, in seconds. */
  properties: {
    /** Minimum travel time to a point in the cell. */
    min?: number
    /** Maximum travel time to a point in the cell. */
    max?: number
    /** Mean travel time to the points in the cell. */
    mean?: number
  }
}

/** Cells of one search, union or intersection. */
export type GeoGridResult = {
  /** Id of the search, union or intersection. */
  search_id: string
  /** Reachable cells. */
  cells: Array<GeoGridCell>
}

/** H3 and Geohash response. */
export type GeoGridResponse = {
  /** One result per search, union and intersection. */
  results: Array<GeoGridResult>
}

/** Fields shared by H3 (Fast) and Geohash (Fast) searches. */
export type GeoGridFastRequestSearchBase<Centroid> = Snapping & {
  /** Search id, used to match results and in unions/intersections. Must be unique among all searches. */
  id: string,
  /** Departure location in `one_to_many`, arrival location in `many_to_one`: either `lat`/`lng`, or the centroid of a cell. */
  coords: Coords | Centroid,
  /** Transportation mode and parameters. */
  transportation: TransportationFastRequestCommons
  /** Time period the journeys are computed for. Only `weekday_morning` is available. */
  arrival_time_period : 'weekday_morning',
  /** Maximum journey time in seconds. The maximum depends on `resolution`. */
  travel_time: number,
  /**
   * true (default) - returned cells will not cover large nearby water bodies
   *
   * false - returned cells may cover nearby water bodies like large lakes, wide rivers and seas
   */
  remove_water_bodies?: boolean
}

/** Uses the centroid of a geohash cell as the search location. */
export type GeohashCentroid = {
  /** Geohash whose centroid is the search location. Mutually exclusive with `lat`/`lng`. */
  geohash_centroid: string
}

/** Uses the centroid of an H3 cell as the search location. */
export type H3Centroid = {
  /** H3 index whose centroid is the search location. Mutually exclusive with `lat`/`lng`. */
  h3_centroid: string
}
