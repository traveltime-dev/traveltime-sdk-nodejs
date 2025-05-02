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
  walkingTimeToStation?: number; // Optional uint32, default 0 means use service default (1800s)
}

export interface DrivingAndPublicTransportDetails {
  walkingTimeToStation?: number; // Optional uint32, default 0 means use service default (1800s)
  drivingTimeToStation?: number; // Optional uint32, default 0 means use service default (1800s)
  parkingTime?: number; // Optional sint32, default -1 means use service default (300s)
}

export type TransportationDetails =
  | { publicTransport: PublicTransportDetails }
  | { drivingAndPublicTransport: DrivingAndPublicTransportDetails };

export interface TimeFilterFastProtoRequest {
  country: TimeFilterFastProtoCountry
  departureLocation: Coords,
  destinationCoordinates: Array<Coords>,
  transportation: TimeFilterFastProtoTransportation,
  transportationDetails?: TransportationDetails,
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
