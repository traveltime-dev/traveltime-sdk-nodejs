import {
  LocationRequest,
  RangeRequestFull,
  ResponseFares,
  ResponseRoute,
  RouteResponseTransportationMode,
  Snapping,
  TransportationRequestCommons,
} from './common';

/**
 * Properties a Time Filter search can return for each location.
 * `distance` and `distance_breakdown` are for `driving`, `walking` and `cycling` only;
 * `fares` is UK only, for public transport modes.
 */
export declare type TimeFilterRequestProperty = 'travel_time' | 'distance' | 'distance_breakdown' | 'fares' | 'route';

/** Fields shared by Time Filter departure and arrival searches. */
export type TimeFilterRequestSearchBase = Snapping & {
  /** Search id, used to match results. Must be unique among all searches. */
  'id': string;
  /** Transportation mode and parameters. Only `type` is required. */
  'transportation': TransportationRequestCommons;
  /** Maximum journey time in seconds. Maximum `14400` (4 hours) as standard. */
  'travel_time': number;
  /** Properties to return for each reachable location. */
  'properties': Array<TimeFilterRequestProperty>;
  /** Departure or arrival window returning alternative journeys. Public transport modes only. */
  'range'?: RangeRequestFull;
}

/** A one-to-many search from one departure location. */
export type TimeFilterRequestDepartureSearch = TimeFilterRequestSearchBase & {
  /** Id of the location to depart from. Must reference an id in `locations`. */
  'departure_location_id': string;
  /** Ids of the locations to arrive at. Must reference ids in `locations`. Maximum 2000. */
  'arrival_location_ids': Array<string>;
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'departure_time': string;
}

/** A many-to-one search to one arrival location. */
export type TimeFilterRequestArrivalSearch = TimeFilterRequestSearchBase & {
  /** Ids of the locations to depart from. Must reference ids in `locations`. Maximum 2000. */
  'departure_location_ids': Array<string>;
  /** Id of the location to arrive at. Must reference an id in `locations`. */
  'arrival_location_id': string;
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'arrival_time': string;
}

/** Time Filter (Travel Time Matrix) request body. */
export type TimeFilterRequest = {
  /** Locations that searches reference by id. */
  'locations': Array<LocationRequest>;
  /** Searches based on departure time. Maximum 10. */
  'departure_searches'?: Array<TimeFilterRequestDepartureSearch>;
  /** Searches based on arrival time. Maximum 10. */
  'arrival_searches'?: Array<TimeFilterRequestArrivalSearch>;
};

/** Distance covered by one mode. */
export type ResponseDistanceBreakdownItem = {
  /** Mode the distance was covered by. */
  'mode': RouteResponseTransportationMode;
  /** Distance in meters. */
  'distance': number;
}

/** Properties of one journey. Only requested properties are present. */
export type TimeFilterResponseProperties = {
  /** Journey time in seconds. */
  'travel_time': number;
  /** Journey distance in meters. */
  'distance'?: number;
  /** Distance covered per mode, e.g. by car or bus. */
  'distance_breakdown'?: Array<ResponseDistanceBreakdownItem>;
  /** Journey fares. UK only. */
  'fares'?: ResponseFares;
  /** The route itself. */
  'route'?: ResponseRoute;
}

/** A reachable location and its journeys. */
export type TimeFilterResponseLocation = {
  /** Location id from the request. */
  'id': string;
  /** One entry per journey: several when `range` is enabled, sorted by `travel_time`. */
  'properties': Array<TimeFilterResponseProperties>;
}

/** Results of one search. */
export type TimeFilterResponseResult = {
  /** Id of the search. */
  'search_id': string;
  /** Locations reachable within `travel_time`. */
  'locations': Array<TimeFilterResponseLocation>;
  /** Ids of locations not reachable within `travel_time`. */
  'unreachable': Array<string>;
}

/** Time Filter (Travel Time Matrix) response. */
export type TimeFilterResponse = {
  /** One result per search, sorted by search id. */
  'results': Array<TimeFilterResponseResult>
};
