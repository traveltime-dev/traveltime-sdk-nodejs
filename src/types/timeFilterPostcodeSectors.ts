import {
  Coords,
  RangeRequestFull,
  Snapping,
  TransportationRequestCommons,
  TravelTimeResponseStatistics,
} from './common';

/**
 * Properties a postcode sectors search can return for each sector.
 * - `travel_time_reachable` - travel time statistics of the reachable postcodes in the sector.
 * - `travel_time_all` - travel time statistics of all postcodes in the sector.
 * - `coverage` - percentage of reachable postcodes in the sector.
 */
export type TimeFilterPostcodeSectorsRequestProperty = 'travel_time_reachable' | 'travel_time_all' | 'coverage';

/** Fields shared by postcode sectors departure and arrival searches. */
export type TimeFilterPostcodeSectorsRequestSearchBase = Snapping & {
  /** Search id, used to match results. Must be unique among all searches. */
  'id': string;
  /** Transportation mode and parameters. Only `type` is required; `driving+public_transport` is not supported. */
  'transportation': TransportationRequestCommons;
  /** Departure location for a departure search, arrival location for an arrival search. */
  'coords': Coords
  /** Maximum journey time in seconds. Maximum `14400` (4 hours) as standard. */
  'travel_time': number;
  /**
   * Share of a sector's postcodes, `0.0` to `1.0`, that must be reachable for it to be returned.
   * `0` returns sectors with at least one reachable postcode.
   */
  'reachable_postcodes_threshold': number;
  /** Departure or arrival window. Public transport modes only. */
  'range'?: RangeRequestFull;
  /** Properties to return for each sector. */
  'properties': Array<TimeFilterPostcodeSectorsRequestProperty>;
}

/** A search that leaves `coords` no earlier than `departure_time`. */
export type TimeFilterPostcodeSectorsRequestDepartureSearch = TimeFilterPostcodeSectorsRequestSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'departure_time': string;
}

/** A search that reaches `coords` no later than `arrival_time`. */
export type TimeFilterPostcodeSectorsRequestArrivalSearch = TimeFilterPostcodeSectorsRequestSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'arrival_time': string;
}

/** Time Filter (Postcode Sectors) request body. UK only. */
export type TimeFilterPostcodeSectorsRequest = {
  /** Searches based on departure time. Maximum 10. */
  'departure_searches'?: Array<TimeFilterPostcodeSectorsRequestDepartureSearch>;
  /** Searches based on arrival time. Maximum 10. */
  'arrival_searches'?: Array<TimeFilterPostcodeSectorsRequestArrivalSearch>;
}

/** Properties of a sector. Only requested properties are present. */
export type TimeFilterPostcodeSectorResponseProperties = {
  /** Travel time statistics of the reachable postcodes in the sector. */
  'travel_time_reachable'?: TravelTimeResponseStatistics;
  /** Travel time statistics of all postcodes in the sector. */
  'travel_time_all'?: TravelTimeResponseStatistics;
  /** Percentage of reachable postcodes in the sector, `0.0` to `100.0`. */
  'coverage'?: number;
}

/** A sector that met `reachable_postcodes_threshold`. */
export type TimeFilterPostcodeSectorsResponseSector = {
  /** The postcode sector. */
  'code': string;
  /** Requested properties of the sector. */
  'properties': TimeFilterPostcodeSectorResponseProperties;
}

/** Results of one search. */
export type TimeFilterPostcodeSectorsResponseResult = {
  /** Id of the search. */
  'search_id': string;
  /** Sectors that met `reachable_postcodes_threshold`. */
  'sectors': Array<TimeFilterPostcodeSectorsResponseSector>;
}

/** Time Filter (Postcode Sectors) response. */
export type TimeFilterPostcodeSectorsResponse = {
  /** One result per search, sorted by search id. */
  'results': Array<TimeFilterPostcodeSectorsResponseResult>;
}
