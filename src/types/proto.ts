import { protoCountries } from '../client/proto/countries';
import { Coords } from './common';

export type TimeFilterFastProtoDistanceTransportation = 'driving+ferry' | 'walking+ferry' | 'driving' | 'cycling+ferry'
export type TimeFilterFastProtoTransportation = 'pt' | TimeFilterFastProtoDistanceTransportation;
export type TimeFilterFastProtoCountry = typeof protoCountries[number]
export type TimeFilterFastProtoDistanceCountry = TimeFilterFastProtoCountry

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

export interface TimeFilterFastProtoDistanceRequest {
  country: TimeFilterFastProtoDistanceCountry
  departureLocation: Coords,
  destinationCoordinates: Array<Coords>,
  transportation: TimeFilterFastProtoDistanceTransportation,
  travelTime: number,
}

export interface TimeFilterFastProtoResponseProperties {
  properties: {
    travelTimes: Array<number>
  }
}

export interface TimeFilterFastProtoDistanceResponseProperties {
  properties: {
    travelTimes: Array<number>,
    distances: Array<number>
  }
}

export interface TimeFilterFastProtoResponseError {
  error: {
    type: string
  }
}

export type TimeFilterFastProtoResponse = TimeFilterFastProtoResponseProperties | TimeFilterFastProtoDistanceResponseProperties | TimeFilterFastProtoResponseError
