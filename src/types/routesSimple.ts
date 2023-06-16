import { LocationRequest, RangeRequestFull, TransportationRequestCommons } from './common';
import { RoutesRequestProperty } from './routes';

export type RoutesSimple = {
  locations: Array<LocationRequest>
  searchIds: Array<{ one: string, many: string[] }>
  leaveTime: string
  transportation: TransportationRequestCommons
  properties: Array<RoutesRequestProperty>
  searchType?: 'arrive' | 'depart'
  range?: RangeRequestFull
}
