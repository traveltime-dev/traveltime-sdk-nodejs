import { LocationRequest, RangeRequestFull, TransportationRequestCommons } from './common';
import { TimeFilterRequestProperty } from './timeFilter';
import { TimeFilterFastRequestProperty, TimeFilterFastRequestTransportation } from './timeFilterFast';

export type TimeFilterSimple = {
  locations: Array<LocationRequest>
  transportation: TransportationRequestCommons
  travelTime: number
  properties: Array<TimeFilterRequestProperty>
  leaveTime: string
  searchIds: Array<{ one: string, many: string[] }>
  searchType?: 'arrive' | 'depart'
  range?: RangeRequestFull
}

export type TimeFilterFastSimple = {
  locations: Array<LocationRequest>
  searchIds: Array<{ one: string, many: string[] }>
  transportation: TimeFilterFastRequestTransportation
  travelTime: number
  searchType?: 'one_to_many' | 'many_to_one'
  properties?: Array<TimeFilterFastRequestProperty>;
}
