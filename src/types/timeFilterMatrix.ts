import { Coords } from './common';
import { TimeFilterRequestSearchBase } from './timeFilter';
import { TimeFilterFastRequestProperty, TimeFilterFastRequestTransportation } from './timeFilterFast';

export type TimeFilterManyToManyMatrixRequestBase = {
  travelTime: number
  coordsFrom: Array<Coords>
  coordsTo: Array<Coords>
}

export type TimeFilterFastManyToManyMatrixRequest = TimeFilterManyToManyMatrixRequestBase & {
  transportation: TimeFilterFastRequestTransportation
  /**
   * Default value is `['travel_time']`
   */
  properties?: Array<TimeFilterFastRequestProperty>;
  /**
   * Default value is `100_000`.
   * Max value is `100_000`.
   */
  maxSearchesPerRequest?: number
}

export type TimeFilterManyToManyMatrixRequest = TimeFilterManyToManyMatrixRequestBase & {
  transportation: TimeFilterRequestSearchBase['transportation']
  /**
   * Default value is `['travel_time']`
   */
  properties?: TimeFilterRequestSearchBase['properties'];
  snapping?: TimeFilterRequestSearchBase['snapping']
  leaveTime: string
  searchType?: 'arrive' | 'depart'
  /**
   * Default value is `2_000`.
   * Max value is `2_000`.
   */
  maxSearchesPerRequest?: number
}

export type TimeFilterFastManyToManyMatrixResponse = {
  travelTimes: Array<Array<number | null>> | undefined
  distances: Array<Array<number | null>> | undefined
  errors: Array<Error>
}

export type TimeFilterManyToManyMatrixResponse = {
  travelTimes: Array<Array<number | null>> | undefined
  distances: Array<Array<number | null>> | undefined
  errors: Array<Error>
}
