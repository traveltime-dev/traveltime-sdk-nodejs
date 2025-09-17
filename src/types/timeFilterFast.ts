import {
  LocationRequest,
  ResponseFareTicket,
  Snapping,
  TransportationFastRequestCommons,
} from './common';

export type TimeFilterFastRequestArrivalTimePeriod = 'weekday_morning';
export type TimeFilterFastRequestProperty = 'travel_time' | 'fares' | 'distance';

export type TimeFilterFastRequestTransportation = TransportationFastRequestCommons

export type TimeFilterFastRequestArrivalSearchBase = Snapping & {
  'id': string;
  'transportation': TimeFilterFastRequestTransportation;
  'travel_time': number;
  'arrival_time_period': TimeFilterFastRequestArrivalTimePeriod;
  'properties': Array<TimeFilterFastRequestProperty>;
}

export type TimeFilterFastRequestArrivalManyToOneSearch = TimeFilterFastRequestArrivalSearchBase & {
  'arrival_location_id': string;
  'departure_location_ids': Array<string>;
}

export type TimeFilterFastRequestArrivalOneToManySearch = TimeFilterFastRequestArrivalSearchBase & {
  'departure_location_id': string;
  'arrival_location_ids': Array<string>;
}

export type TimeFilterFastArrivalSearchesRequest = {
  'many_to_one'?: Array<TimeFilterFastRequestArrivalManyToOneSearch>;
  'one_to_many'?: Array<TimeFilterFastRequestArrivalOneToManySearch>;
}

export type TimeFilterFastRequest = {
  'locations': Array<LocationRequest>;
  'arrival_searches': TimeFilterFastArrivalSearchesRequest
};

export type TimeFilterFastResponseFares = {
  'tickets_total': Array<ResponseFareTicket>;
}

export type TimeFilterFastResponseProperties = {
  'travel_time': number;
  'fares'?: TimeFilterFastResponseFares;
}

export type TimeFilterFastResponseLocation = {
  'id': string;
  'properties': TimeFilterFastResponseProperties;
}

export type TimeFilterFastResponseResult = {
  'search_id': string;
  'locations': Array<TimeFilterFastResponseLocation>;
  'unreachable': Array<string>;
}

export type TimeFilterFastResponse = {
  'results': Array<TimeFilterFastResponseResult>
};
