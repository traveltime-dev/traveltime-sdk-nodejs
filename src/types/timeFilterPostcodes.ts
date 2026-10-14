import {
  Coords,
  RangeRequestFull,
  Snapping,
  TransportationRequestCommons,
} from './common';

/** Properties a postcodes search can return for each postcode. */
export type TimeFilterPostcodesRequestProperty = 'travel_time' | 'distance';

/** Fields shared by postcodes departure and arrival searches. */
export type TimeFilterPostcodesSearchBase = Snapping & {
  /** Search id, used to match results. Must be unique among all searches. */
  'id': string;
  /** Departure location for a departure search, arrival location for an arrival search. */
  'coords': Coords
  /** Transportation mode and parameters. Only `type` is required; `driving+public_transport` is not supported. */
  'transportation': TransportationRequestCommons;
  /** Maximum journey time in seconds. Maximum `14400` (4 hours) as standard. */
  'travel_time': number;
  /** Properties to return for each postcode. */
  'properties': Array<TimeFilterPostcodesRequestProperty>;
  /** Departure or arrival window returning alternative journeys. Public transport modes only. */
  'range'?: RangeRequestFull;
}

/** A search that leaves `coords` no earlier than `departure_time`. */
export type TimeFilterPostcodesRequestDepartureSearch = TimeFilterPostcodesSearchBase & {
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'departure_time': string;
}

/** A search that reaches `coords` no later than `arrival_time`. */
export type TimeFilterPostcodesRequestArrivalSearch = TimeFilterPostcodesSearchBase & {
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'arrival_time': string;
}

/** Time Filter (Postcodes) request body. UK only. */
export type TimeFilterPostcodesRequest = {
  /** Searches based on departure time. Maximum 10. */
  'departure_searches'?: Array<TimeFilterPostcodesRequestDepartureSearch>;
  /** Searches based on arrival time. Maximum 10. */
  'arrival_searches'?: Array<TimeFilterPostcodesRequestArrivalSearch>;
};
/** Properties of one journey. Only requested properties are present. */
export type TimeFilterPostcodesResponseProperties = {
  /** Journey time in seconds. */
  'travel_time'?: number;
  /** Journey distance in meters. */
  'distance'?: number;
}
/** A reachable postcode and its journeys. */
export type TimeFilterPostcodesResponsePostcode = {
  /** The postcode. */
  'code': string;
  /** One entry per journey: several when `range` is enabled, sorted by `travel_time`. */
  'properties': Array<TimeFilterPostcodesResponseProperties>;
}

/** Results of one search. */
export type TimeFilterPostcodesResponseResult = {
  /** Id of the search. */
  'search_id': string;
  /** Postcodes reachable within `travel_time`. */
  'postcodes': Array<TimeFilterPostcodesResponsePostcode>;
}

/** Time Filter (Postcodes) response. */
export type TimeFilterPostcodesResponse = {
  /** One result per search, sorted by search id. */
  'results': Array<TimeFilterPostcodesResponseResult>;
};
