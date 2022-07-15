import { Coords } from './common';

export type TimeFilterFastProtoTransportation = 'pt' | 'walking+ferry' | 'cycling+ferry' | 'driving+ferry';
export type TimeFilterFastProtoCountry = 'nl' | 'at' | 'be' | 'de' | 'fr' | 'ie' | 'lt' | 'uk'

export interface TimeFilterFastProtoProperties {
  fares?: boolean,
  distances?: boolean
}

export interface TimeFilterFastProtoRequest {
  country: TimeFilterFastProtoCountry
  departureLocation: Coords,
  destinationCoordinates: Array<Coords>,
  transportation: TimeFilterFastProtoTransportation,
  travelTime: number,
}

interface TimeFilterFastProtoResponseProperties {
  properties: {
    travelTimes: Array<number>
  }
}

interface TimeFilterFastProtoResponseError {
  error: {
    type: string
  }
}

export type TimeFilterFastProtoResponse = TimeFilterFastProtoResponseProperties | TimeFilterFastProtoResponseError
