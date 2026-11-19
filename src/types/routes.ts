import {
  RangeRequestFull,
  LocationRequest,
  TransportationRequestCommons,
  ResponseRoute,
  ResponseFares,
  Snapping,
} from './common';
import { GeoGridCell, GeoGridProperties } from './geogrid';

/** Properties a Routes search can return for each location. */
export type RoutesRequestProperty = 'travel_time' | 'distance' | 'fares' | 'route' | 'h3';

/** H3 representation of the routes returned by a search. */
export type RoutesRequestH3 = {
  /** H3 resolution of the returned cells (higher = smaller cells), from `6` to `11`. Defaults to `8`. */
  'resolution'?: number;
  /** Travel time statistics to return for each cell. None by default. */
  'properties'?: Array<GeoGridProperties>;
}

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
  /** H3 representation settings. Applies only when `properties` includes `h3`. */
  'h3'?: RoutesRequestH3;
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

/** A cell a journey passes through. */
export type RoutesResponseH3Cell = {
  /** H3 index of the cell. */
  'id': string;
  /** Travel time statistics requested in `h3.properties`, in seconds. Absent when none were requested. */
  'properties'?: GeoGridCell['properties'];
}

/** H3 representation of one journey. */
export type RoutesResponseH3 = {
  /** Cells the journey passes through, in the order it first reaches them. */
  'cells': Array<RoutesResponseH3Cell>;
}

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
  /** H3 representation of the journey. */
  'h3'?: RoutesResponseH3;
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
