import {
  Coords,
  RangeRequestFull,
  TransportationRequestCommons,
  TravelTimeResponseStatistics,
} from './common';

export type TimeFilterPostcodeSectorsRequestProperty = 'travel_time_reachable' | 'travel_time_all' | 'coverage';

export type TimeFilterPostcodeSectorsRequestSearchBase = {
  'id': string;
  'transportation': TransportationRequestCommons;
  'coords': Coords
  'travel_time': number;
  'reachable_postcodes_threshold': number;
  'range'?: RangeRequestFull;
  'properties': Array<TimeFilterPostcodeSectorsRequestProperty>;
}

export type TimeFilterPostcodeSectorsRequestDepartureSearch = TimeFilterPostcodeSectorsRequestSearchBase & {
  'departure_time': string;
}

export type TimeFilterPostcodeSectorsRequestArrivalSearch = TimeFilterPostcodeSectorsRequestSearchBase & {
  'arrival_time': string;
}

export type TimeFilterPostcodeSectorsRequest = {
  'departure_searches'?: Array<TimeFilterPostcodeSectorsRequestDepartureSearch>;
  'arrival_searches'?: Array<TimeFilterPostcodeSectorsRequestArrivalSearch>;
}

export type TimeFilterPostcodeSectorResponseProperties = {
  'travel_time_reachable'?: TravelTimeResponseStatistics;
  'travel_time_all'?: TravelTimeResponseStatistics;
  'coverage'?: number;
}

export type TimeFilterPostcodeSectorsResponseSector = {
  'code': string;
  'properties': TimeFilterPostcodeSectorResponseProperties;
}

export type TimeFilterPostcodeSectorsResponseResult = {
  'search_id': string;
  'sectors': Array<TimeFilterPostcodeSectorsResponseSector>;
}

export type TimeFilterPostcodeSectorsResponse = {
  'results': Array<TimeFilterPostcodeSectorsResponseResult>;
}
