import { LocationRequest, RangeRequestFull, TransportationRequestCommons } from './common';
import { RoutesRequestProperty } from './routes';

export type RoutesSimple = {
  locations: Array<LocationRequest>
    /**
   * Object containing required searches. Search Id pairs look like {K: [V]}
   *
   * K - key of object (search ID).
   * When Search type is departure search - K[key] corresponds to [departure_location_id](https://docs.traveltime.com/api/reference/routes#departure_searches-departure_location_id).
   * When Search type is arrival search - K[key] corresponds to [arrival_location_id](https://docs.traveltime.com/api/reference/routes#departure_searches-arrival_location_ids)
   *
   * V - Array of search ids that should be calculated to/from its K.
   * When Search type is departure search - V[ID array] corresponds to [arrival_location_ids](https://docs.traveltime.com/api/reference/routes#departure_searches-arrival_location_ids).
   * When Search type is arrival search - V[ID array] [departure_location_ids](https://docs.traveltime.com/api/reference/routes#arrival_searches-departure_location_ids)
   */
  searchIds: Record<string, Array<string>>
  leaveTime: string
  transportation: TransportationRequestCommons
  properties: Array<RoutesRequestProperty>
  /**
   * Default value `depart`
   */
  searchType?: 'arrive' | 'depart'
  range?: RangeRequestFull
}
