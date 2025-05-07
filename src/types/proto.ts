import { protoCountries } from '../client/proto/countries';
import { Coords } from './common';

export type TimeFilterFastProtoDistanceTransportation = 'driving+ferry' | 'walking+ferry' | 'driving' | 'walking' | 'cycling' | 'cycling+ferry'
export type TimeFilterFastProtoTransportation = 'pt' | 'driving+pt' | TimeFilterFastProtoDistanceTransportation;
export type TimeFilterFastProtoCountry = typeof protoCountries[number]
export type TimeFilterFastProtoDistanceCountry = TimeFilterFastProtoCountry

export interface TimeFilterFastProtoProperties {
  fares?: boolean,
  distances?: boolean
}

export interface PublicTransportDetails {
  walkingTimeToStation?: number;
}

export interface DrivingAndPublicTransportDetails {
  walkingTimeToStation?: number;
  drivingTimeToStation?: number;
  parkingTime?: number;
}

export type DetailedTransportation = 
  | { mode: 'pt', details?: PublicTransportDetails }
  | { mode: 'driving+pt', details?: DrivingAndPublicTransportDetails };

export interface TimeFilterFastProtoRequest {
  country: TimeFilterFastProtoCountry
  departureLocation: Coords,
  destinationCoordinates: Array<Coords>,
  transportation: TimeFilterFastProtoTransportation | DetailedTransportation,
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
