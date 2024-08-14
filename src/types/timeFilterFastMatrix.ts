import { Coords } from './common';
import { TimeFilterFastRequestProperty, TimeFilterFastRequestTransportation } from './timeFilterFast';

export type TimeFilterFastManyToManyMatrixRequest = {
  transportation: TimeFilterFastRequestTransportation
  travelTime: number
  /**
   * Default value is `['travel_time']`
   */
  properties?: Array<TimeFilterFastRequestProperty>;
  coordsFrom: Array<Coords>
  coordsTo: Array<Coords>
  /**
   * Default value is `100_000`.
   * Max value is `100_000`.
   */
  maxSearchesPerRequest?: number
}

export type TimeFilterFastManyToManyMatrixResponse = {
  travelTimes: Array<Array<number | null>> | undefined
  distances: Array<Array<number | null>> | undefined
  errors: Array<Error>
}
