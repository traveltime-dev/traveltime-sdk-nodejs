import { LocationRequest, RangeRequestFull, TransportationRequestCommons } from './common';
import { TimeFilterRequestProperty } from './timeFilter';
import { TimeFilterFastRequestProperty, TimeFilterFastRequestTransportation } from './timeFilterFast';

export type TimeFilterSimple = {
  locations: Array<LocationRequest>
  transportation: TransportationRequestCommons
  travelTime: number
  properties: Array<TimeFilterRequestProperty>
  leaveTime: string
  /**
   * Object containing required searches. Search Id pairs look like {K: [V]}
   *
   * K - key of object (search ID).
   * When Search type is departure search - K[key] corresponds to [departure_location_id](https://docs.traveltime.com/api/reference/travel-time-distance-matrix#departure_searches-departure_location_id).
   * When Search type is arrival search - K[key] corresponds to [arrival_location_id](https://docs.traveltime.com/api/reference/travel-time-distance-matrix#arrival_searches-arrival_location_id)
   *
   * V - List of search ids that should be calculated to/from its K.
   * When Search type is departure search - V[ID list] corresponds to [arrival_location_ids](https://docs.traveltime.com/api/reference/travel-time-distance-matrix#departure_searches-arrival_location_ids).
   * When Search type is arrival search - V[ID list] [departure_location_ids](https://docs.traveltime.com/api/reference/travel-time-distance-matrix#arrival_searches-departure_location_ids)
   */
  searchIds: Record<string, Array<string>>
  searchType?: 'arrive' | 'depart'
  range?: RangeRequestFull
}

export type TimeFilterFastSimple = {
  locations: Array<LocationRequest>
    /**
   * Object containing required searches. Search Id pairs look like {K: [V]}
   *
   * K - key of object (search ID).
   * When Search type is one_to_many - K[key] corresponds to [departure_location_id](https://docs.traveltime.com/api/reference/time-filter-fast#arrival_searches-one_to_many-departure_location_id).
   * When Search type is many_to_one - K[key] corresponds to [arrival_location_id](https://docs.traveltime.com/api/reference/time-filter-fast#arrival_searches-many_to_one-arrival_location_id)
   *
   * V - List of search ids that should be calculated to/from its K.
   * When Search type is one_to_many - V[ID list] corresponds to [arrival_location_ids](https://docs.traveltime.com/api/reference/time-filter-fast#arrival_searches-one_to_many-arrival_location_ids).
   * When Search type is many_to_one - V[ID list] [departure_location_ids](https://docs.traveltime.com/api/reference/time-filter-fast#arrival_searches-many_to_one-departure_location_ids)
   */
  searchIds: Record<string, Array<string>>
  transportation: TimeFilterFastRequestTransportation
  travelTime: number
  searchType?: 'one_to_many' | 'many_to_one'
  properties?: Array<TimeFilterFastRequestProperty>;
}
