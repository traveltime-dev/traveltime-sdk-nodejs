import {
  Coords,
  RangeRequestFull,
  TransportationRequestCommons,
  TravelTimeResponseStatistics,
} from './common';

export type TimeFilterPostcodeDistrictsRequestProperty = 'travel_time_reachable' | 'travel_time_all' | 'coverage';

export type TimeFilterPostcodeDistrictsRequestSearchBase = {
  'id': string;
  'coords': Coords
  'transportation': TransportationRequestCommons;
  'travel_time': number;
  'reachable_postcodes_threshold': number;
  'properties': Array<TimeFilterPostcodeDistrictsRequestProperty>;
  'range'?: RangeRequestFull;
}

export type TimeFilterPostcodeDistrictsRequestDepartureSearch = TimeFilterPostcodeDistrictsRequestSearchBase & {
  'departure_time': string;
}

export type TimeFilterPostcodeDistrictsRequestArrivalSearch = TimeFilterPostcodeDistrictsRequestSearchBase & {
  'arrival_time': string;

}
export type TimeFilterPostcodeDistrictsRequest = {
  'departure_searches'?: Array<TimeFilterPostcodeDistrictsRequestDepartureSearch>;
  'arrival_searches'?: Array<TimeFilterPostcodeDistrictsRequestArrivalSearch>;
};

export type TimeFilterPostcodeDistrictResponseProperties = {
  'travel_time_reachable'?: TravelTimeResponseStatistics;
  'travel_time_all'?: TravelTimeResponseStatistics;
  'coverage'?: number;
}

export type TimeFilterPostcodeDistrictsResponseDistrict = {
  'code': string;
  'properties': TimeFilterPostcodeDistrictResponseProperties;
}

export type TimeFilterPostcodeDistrictsResponseResult = {
  'search_id': string;
  'districts': Array<TimeFilterPostcodeDistrictsResponseDistrict>;
}

export type TimeFilterPostcodeDistrictsResponse = {
  'results': Array<TimeFilterPostcodeDistrictsResponseResult>;
};
