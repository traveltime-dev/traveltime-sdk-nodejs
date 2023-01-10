import { Coords, LevelOfDetail } from './common';

export type TimeMapFastTransportation = 'public_transport' | 'driving' | 'driving+public_transport' | 'driving+ferry' | 'cycling' | 'cycling+ferry' | 'walking' | 'walking+ferry'

export type TimeMapFastRequestSearch = {
  id: string,
  coords: Coords,
  transportation: {
    type: TimeMapFastTransportation
  },
  arrival_time_period : 'weekday_morning',
  travel_time: number,
  level_of_detail?: LevelOfDetail
}

export type TimeMapFastRequestArrivalSearch = {
  one_to_many?: Array<TimeMapFastRequestSearch>,
  many_to_one?: Array<TimeMapFastRequestSearch>
}

export type TimeMapFastRequest = {
  arrival_searches: TimeMapFastRequestArrivalSearch
}
