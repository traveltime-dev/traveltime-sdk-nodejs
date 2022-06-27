import {
  RangeRequestFull,
  LocationRequest,
  TransportationRequestCommons,
  ResponseRoute,
  ResponseFares,
} from './common';

export type RoutesRequestProperty = 'travel_time' | 'distance' | 'fares' | 'route';

export type RoutesRequestSearchBase = {
  'id': string;
  'transportation': TransportationRequestCommons;
  'properties': Array<RoutesRequestProperty>;
  'range'?: RangeRequestFull;
}

export type RoutesRequestDepartureSearch = RoutesRequestSearchBase & {
  'departure_location_id': string;
  'arrival_location_ids': Array<string>;
  'departure_time': string;
}

export type RoutesRequestArrivalSearch = RoutesRequestSearchBase & {
  'departure_location_ids': Array<string>;
  'arrival_location_id': string;
  'arrival_time': string;
}

export type RoutesRequest = {
  'locations': Array<LocationRequest>;
  'departure_searches'?: Array<RoutesRequestDepartureSearch>;
  'arrival_searches'?: Array<RoutesRequestArrivalSearch>;
};

export type RoutesResponseProperties = {
  'travel_time': number;
  'distance'?: number;
  'fares'?: ResponseFares;
  'route'?: ResponseRoute;
}

export type RoutesResponseLocation = {
  'id': string;
  'properties': Array<RoutesResponseProperties>;
}

export type RoutesResponseResult = {
  'search_id': string;
  'locations': Array<RoutesResponseLocation>;
  'unreachable': Array<string>;
}

export type RoutesResponse = {
  'results': Array<RoutesResponseResult>
};
