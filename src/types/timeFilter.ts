import {
  LocationRequest,
  RangeRequestFull,
  ResponseFares,
  ResponseRoute,
  RouteResponseTransportationMode,
  Snapping,
  TransportationRequestCommons,
} from './common';

export declare type TimeFilterRequestProperty = 'travel_time' | 'distance' | 'distance_breakdown' | 'fares' | 'route';

export type TimeFilterRequestSearchBase = Snapping & {
  'id': string;
  'transportation': TransportationRequestCommons;
  'travel_time': number;
  'properties': Array<TimeFilterRequestProperty>;
  'range'?: RangeRequestFull;
}

export type TimeFilterRequestDepartureSearch = TimeFilterRequestSearchBase & {
  'departure_location_id': string;
  'arrival_location_ids': Array<string>;
  'departure_time': string;
}

export type TimeFilterRequestArrivalSearch = TimeFilterRequestSearchBase & {
  'departure_location_ids': Array<string>;
  'arrival_location_id': string;
  'arrival_time': string;
}

export type TimeFilterRequest = {
  'locations': Array<LocationRequest>;
  'departure_searches'?: Array<TimeFilterRequestDepartureSearch>;
  'arrival_searches'?: Array<TimeFilterRequestArrivalSearch>;
};

export type ResponseDistanceBreakdownItem = {
  'mode': RouteResponseTransportationMode;
  'distance': number;
}

export type TimeFilterResponseProperties = {
  'travel_time': number;
  'distance'?: number;
  'distance_breakdown'?: Array<ResponseDistanceBreakdownItem>;
  'fares'?: ResponseFares;
  'route'?: ResponseRoute;
}

export type TimeFilterResponseLocation = {
  'id': string;
  'properties': Array<TimeFilterResponseProperties>;
}

export type TimeFilterResponseResult = {
  'search_id': string;
  'locations': Array<TimeFilterResponseLocation>;
  'unreachable': Array<string>;
}

export type TimeFilterResponse = {
  'results': Array<TimeFilterResponseResult>
};
