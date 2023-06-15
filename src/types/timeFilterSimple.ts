import { LocationRequest, RangeRequestFull, TransportationRequestCommons } from './common';
import { TimeFilterRequestProperty } from './timeFilter';

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
