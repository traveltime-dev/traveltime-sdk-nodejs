import {
  Coords,
  RangeRequestFull,
  TransportationRequestCommons,
} from './common';

export type TimeFilterPostcodesRequestProperty = 'travel_time' | 'distance';

export type TimeFilterPostcodesSearchBase = {
  'id': string;
  'coords': Coords
  'transportation': TransportationRequestCommons;
  'travel_time': number;
  'properties': Array<TimeFilterPostcodesRequestProperty>;
  'range'?: RangeRequestFull;
}

export type TimeFilterPostcodesRequestDepartureSearch = TimeFilterPostcodesSearchBase & {
  'departure_time': string;
}

export type TimeFilterPostcodesRequestArrivalSearch = TimeFilterPostcodesSearchBase & {
  'arrival_time': string;
}

export type TimeFilterPostcodesRequest = {
  'departure_searches'?: Array<TimeFilterPostcodesRequestDepartureSearch>;
  'arrival_searches'?: Array<TimeFilterPostcodesRequestArrivalSearch>;
};
export type TimeFilterPostcodesResponseProperties = {
  'travel_time'?: number;
  'distance'?: number;
}
export type TimeFilterPostcodesResponsePostcode = {
  'code': string;
  'properties': Array<TimeFilterPostcodesResponseProperties>;
}

export type TimeFilterPostcodesResponseResult = {
  'search_id': string;
  'postcodes': Array<TimeFilterPostcodesResponsePostcode>;
}

export type TimeFilterPostcodesResponse = {
  'results': Array<TimeFilterPostcodesResponseResult>;
};
