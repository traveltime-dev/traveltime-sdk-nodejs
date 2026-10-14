import {
  RangeRequestFull,
  LocationRequest,
  TransportationRequestCommons,
  ResponseRoute,
  ResponseFares,
  Snapping,
} from './common';

/** Properties a Routes search can return for each location. */
export type RoutesRequestProperty = 'travel_time' | 'distance' | 'fares' | 'route';

/** Fields shared by Routes departure and arrival searches. */
export type RoutesRequestSearchBase = Snapping & {
  /** Search id, used to match results. Must be unique among all searches. */
  'id': string;
  /** Transportation mode and parameters. Only `type` is required. */
  'transportation': TransportationRequestCommons;
  /** Properties to return for each location. */
  'properties': Array<RoutesRequestProperty>;
  /** Departure or arrival window returning alternative journeys. Public transport modes only. */
  'range'?: RangeRequestFull;
}

/** A search from one departure location to up to 2 arrival locations. */
export type RoutesRequestDepartureSearch = RoutesRequestSearchBase & {
  /** Id of the location to depart from. Must reference an id in `locations`. */
  'departure_location_id': string;
  /** Ids of the locations to route to. Must reference ids in `locations`. Maximum 2. */
  'arrival_location_ids': Array<string>;
  /** Earliest departure time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'departure_time': string;
}

/** A search from up to 2 departure locations to one arrival location. */
export type RoutesRequestArrivalSearch = RoutesRequestSearchBase & {
  /** Ids of the locations to route from. Must reference ids in `locations`. Maximum 2. */
  'departure_location_ids': Array<string>;
  /** Id of the location to arrive at. Must reference an id in `locations`. */
  'arrival_location_id': string;
  /** Latest arrival time, extended ISO-8601, e.g. `2026-10-12T13:00:00Z`. */
  'arrival_time': string;
}

/** Routes request body. */
export type RoutesRequest = {
  /** Locations that searches reference by id. */
  'locations': Array<LocationRequest>;
  /** Searches based on departure time. Maximum 10. */
  'departure_searches'?: Array<RoutesRequestDepartureSearch>;
  /** Searches based on arrival time. Maximum 10. */
  'arrival_searches'?: Array<RoutesRequestArrivalSearch>;
};

/** Properties of one journey. Only requested properties are present. */
export type RoutesResponseProperties = {
  /** Journey time in seconds. */
  'travel_time'?: number;
  /** Journey distance in meters. */
  'distance'?: number;
  /** Journey fares. */
  'fares'?: ResponseFares;
  /** The route itself. */
  'route'?: ResponseRoute;
}

/** A reachable location and its journeys. */
export type RoutesResponseLocation = {
  /** Location id from the request. */
  'id': string;
  /** One entry per journey: several when `range` is enabled, sorted by `travel_time`. */
  'properties': Array<RoutesResponseProperties>;
}

/** Results of one search. */
export type RoutesResponseResult = {
  /** Id of the search. */
  'search_id': string;
  /** Locations a route was found to. */
  'locations': Array<RoutesResponseLocation>;
  /** Ids of locations no route was found to, e.g. not reachable within 12 hours. */
  'unreachable': Array<string>;
}

/** Routes response. */
export type RoutesResponse = {
  /** One result per search, sorted by search id. */
  'results': Array<RoutesResponseResult>
};
