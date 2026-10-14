import {
  LocationRequest,
  ResponseFareTicket,
  Snapping,
  TransportationFastRequestCommons,
} from './common';

/** Time period the fast journeys are computed for. */
export type TimeFilterFastRequestArrivalTimePeriod = 'weekday_morning';
/**
 * Properties a Time Filter (Fast) search can return for each location.
 * `distance` is for `driving+ferry`, `cycling+ferry` and `walking+ferry` only; `fares` is UK only.
 */
export type TimeFilterFastRequestProperty = 'travel_time' | 'fares' | 'distance';

/** Transportation mode and parameters for Time Filter (Fast). */
export type TimeFilterFastRequestTransportation = TransportationFastRequestCommons

/** Fields shared by Time Filter (Fast) searches. */
export type TimeFilterFastRequestArrivalSearchBase = Snapping & {
  /** Search id, used to match results. Must be unique among all searches. */
  'id': string;
  /** Transportation mode and parameters. */
  'transportation': TimeFilterFastRequestTransportation;
  /** Maximum journey time in seconds. Maximum `10800` (3 hours) as standard. */
  'travel_time': number;
  /** Time period the journeys are computed for. Only `weekday_morning` is available. */
  'arrival_time_period': TimeFilterFastRequestArrivalTimePeriod;
  /** Properties to return for each reachable location. */
  'properties': Array<TimeFilterFastRequestProperty>;
}

/** A search from many departure locations to one arrival location. */
export type TimeFilterFastRequestArrivalManyToOneSearch = TimeFilterFastRequestArrivalSearchBase & {
  /** Id of the location to arrive at. Must reference an id in `locations`. */
  'arrival_location_id': string;
  /** Ids of the locations to depart from. Must reference ids in `locations`. Maximum 100,000. */
  'departure_location_ids': Array<string>;
}

/** A search from one departure location to many arrival locations. */
export type TimeFilterFastRequestArrivalOneToManySearch = TimeFilterFastRequestArrivalSearchBase & {
  /** Id of the location to depart from. Must reference an id in `locations`. */
  'departure_location_id': string;
  /** Ids of the locations to arrive at. Must reference ids in `locations`. Maximum 100,000. */
  'arrival_location_ids': Array<string>;
}

/** Time Filter (Fast) searches, grouped by direction. */
export type TimeFilterFastArrivalSearchesRequest = {
  /** One arrival location, many departure locations. Maximum 10. */
  'many_to_one'?: Array<TimeFilterFastRequestArrivalManyToOneSearch>;
  /** One departure location, many arrival locations. Maximum 10. */
  'one_to_many'?: Array<TimeFilterFastRequestArrivalOneToManySearch>;
}

/** Time Filter (Fast) request body. */
export type TimeFilterFastRequest = {
  /** Locations that searches reference by id. */
  'locations': Array<LocationRequest>;
  /** Searches, grouped by direction. */
  'arrival_searches': TimeFilterFastArrivalSearchesRequest
};

/** Fares for a Time Filter (Fast) journey. */
export type TimeFilterFastResponseFares = {
  /** Total fares for the journey; `month` or `year` tickets. */
  'tickets_total': Array<ResponseFareTicket>;
}

/** Properties of the journey to a location. Only requested properties are present. */
export type TimeFilterFastResponseProperties = {
  /** Journey time in seconds. */
  'travel_time': number;
  /** Journey fares. UK only. */
  'fares'?: TimeFilterFastResponseFares;
  /** Journey distance in meters. */
  'distance'?: number
}

/** A reachable location. */
export type TimeFilterFastResponseLocation = {
  /** Location id from the request. */
  'id': string;
  /** Properties of the journey. */
  'properties': TimeFilterFastResponseProperties;
}

/** Results of one search. */
export type TimeFilterFastResponseResult = {
  /** Id of the search. */
  'search_id': string;
  /** Locations reachable within `travel_time`. */
  'locations': Array<TimeFilterFastResponseLocation>;
  /** Ids of locations not reachable within `travel_time`. */
  'unreachable': Array<string>;
}

/** Time Filter (Fast) response. */
export type TimeFilterFastResponse = {
  /** One result per search, sorted by search id. */
  'results': Array<TimeFilterFastResponseResult>
};
