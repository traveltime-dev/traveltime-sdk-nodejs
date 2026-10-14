import {
  Coords,
  RangeRequestFull,
  Snapping,
  TransportationRequestCommons,
  TravelTimeResponseStatistics,
} from './common';

/**
 * Properties a postcode districts search can return for each district.
 * - `travel_time_reachable` - travel time statistics of the reachable postcodes in the district.
 * - `travel_time_all` - travel time statistics of all postcodes in the district.
 * - `coverage` - percentage of reachable postcodes in the district.
 */
export type TimeFilterPostcodeDistrictsRequestProperty = 'travel_time_reachable' | 'travel_time_all' | 'coverage';

/** Fields shared by postcode districts departure and arrival searches. */
export type TimeFilterPostcodeDistrictsRequestSearchBase = Snapping & {
  /** Search id, used to match results. Must be unique among all searches. */
  'id': string;
  /** Departure location for a departure search, arrival location for an arrival search. */
  'coords': Coords
  /** Transportation mode and parameters. Only `type` is required; `driving+public_transport` is not supported. */
  'transportation': TransportationRequestCommons;
  /** Maximum journey time in seconds. Maximum `14400` (4 hours) as standard. */
  'travel_time': number;
  /**
   * Share of a district's postcodes, `0.0` to `1.0`, that must be reachable for it to be returned.
   * `0` returns districts with at least one reachable postcode.
   */
  'reachable_postcodes_threshold': number;
  /** Properties to return for each district. */
  'properties': Array<TimeFilterPostcodeDistrictsRequestProperty>;
  /** Departure or arrival window. Public transport modes only. */
  'range'?: RangeRequestFull;
}

/** A search that leaves `coords` no earlier than `departure_time`. */
export type TimeFilterPostcodeDistrictsRequestDepartureSearch = TimeFilterPostcodeDistrictsRequestSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'departure_time': string;
}

/** A search that reaches `coords` no later than `arrival_time`. */
export type TimeFilterPostcodeDistrictsRequestArrivalSearch = TimeFilterPostcodeDistrictsRequestSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'arrival_time': string;

}
/** Time Filter (Postcode Districts) request body. UK only. */
export type TimeFilterPostcodeDistrictsRequest = {
  /** Searches based on departure time. Maximum 10. */
  'departure_searches'?: Array<TimeFilterPostcodeDistrictsRequestDepartureSearch>;
  /** Searches based on arrival time. Maximum 10. */
  'arrival_searches'?: Array<TimeFilterPostcodeDistrictsRequestArrivalSearch>;
};

/** Properties of a district. Only requested properties are present. */
export type TimeFilterPostcodeDistrictResponseProperties = {
  /** Travel time statistics of the reachable postcodes in the district. */
  'travel_time_reachable'?: TravelTimeResponseStatistics;
  /** Travel time statistics of all postcodes in the district. */
  'travel_time_all'?: TravelTimeResponseStatistics;
  /** Percentage of reachable postcodes in the district, `0.0` to `100.0`. */
  'coverage'?: number;
}

/** A district that met `reachable_postcodes_threshold`. */
export type TimeFilterPostcodeDistrictsResponseDistrict = {
  /** The postcode district. */
  'code': string;
  /** Requested properties of the district. */
  'properties': TimeFilterPostcodeDistrictResponseProperties;
}

/** Results of one search. */
export type TimeFilterPostcodeDistrictsResponseResult = {
  /** Id of the search. */
  'search_id': string;
  /** Districts that met `reachable_postcodes_threshold`. */
  'districts': Array<TimeFilterPostcodeDistrictsResponseDistrict>;
}

/** Time Filter (Postcode Districts) response. */
export type TimeFilterPostcodeDistrictsResponse = {
  /** One result per search, sorted by search id. */
  'results': Array<TimeFilterPostcodeDistrictsResponseResult>;
};
