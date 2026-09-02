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
 /**
  *Limit on walking path duration. Must be > 0 and <= 1800
   */
  walkingTimeToStation?: number;
}

export interface DrivingAndPublicTransportDetails {
  /**
   *Limit on walking path duration. Must be > 0 and <= 1800
   */
  walkingTimeToStation?: number;
  /**
   *Limit on driving path duration. Must be > 0 and <= 1800
   */
  drivingTimeToStation?: number;
  /**
   * Constant penalty to simulate finding a parking spot. Must be non-negative and less than travel time limit
   */
  parkingTime?: number; }

export type DetailedTransportation =
  | { mode: 'pt', details?: PublicTransportDetails }
  | { mode: 'driving+pt', details?: DrivingAndPublicTransportDetails };

/**
 * Exactly one of `departureLocation` (one-to-many search) or `arrivalLocation`
 * (many-to-one search) must be provided.
 */
export type ProtoLocation =
  | { departureLocation: Coords, arrivalLocation?: never }
  | { arrivalLocation: Coords, departureLocation?: never };

export type TimeFilterFastProtoRequest = ProtoLocation & {
  country: TimeFilterFastProtoCountry
  /**
   * The many points of the search. With `arrivalLocation` these are the departure points.
   * Cannot be more than 200,000.
   */
  destinationCoordinates: Array<Coords>,
  transportation: TimeFilterFastProtoTransportation | DetailedTransportation,
  travelTime: number,
}

export type TimeFilterFastProtoDistanceRequest = ProtoLocation & {
  country: TimeFilterFastProtoDistanceCountry
  /**
   * The many points of the search. With `arrivalLocation` these are the departure points.
   * Cannot be more than 200,000.
   */
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

export interface TimeFilterFastProtoFaresResponseProperties {
  properties: {
    travelTimes: Array<number>,
    monthlyFares: Array<number>
  }
}

export interface TimeFilterFastProtoResponseError {
  error: {
    type: string
  }
}

export type TimeFilterFastProtoResponse = TimeFilterFastProtoResponseProperties | TimeFilterFastProtoDistanceResponseProperties | TimeFilterFastProtoFaresResponseProperties | TimeFilterFastProtoResponseError

export type GeohashFastProtoTransportation = TimeFilterFastProtoTransportation;
export type GeohashFastProtoCountry = TimeFilterFastProtoCountry;

export type GeohashFastProtoCellProperty = 'min' | 'max' | 'mean';

export type GeohashFastProtoRequest = ProtoLocation & {
  country: GeohashFastProtoCountry
  transportation: GeohashFastProtoTransportation | DetailedTransportation,
  travelTime: number,
  resolution: number,
  properties?: Array<GeohashFastProtoCellProperty>,
  removeWaterBodies?: boolean,
}

export interface GeohashFastProtoResponseProperties {
  cells: {
    ids: Array<string>,
    minTravelTimes?: Array<number>,
    maxTravelTimes?: Array<number>,
    meanTravelTimes?: Array<number>,
  }
}

export interface GeohashFastProtoResponseError {
  error: {
    type: string
  }
}

export type GeohashFastProtoResponse = GeohashFastProtoResponseProperties | GeohashFastProtoResponseError

export type H3FastProtoTransportation = TimeFilterFastProtoTransportation;
export type H3FastProtoCountry = TimeFilterFastProtoCountry;

export type H3FastProtoCellProperty = 'min' | 'max' | 'mean';

export type H3FastProtoRequest = ProtoLocation & {
  country: H3FastProtoCountry
  transportation: H3FastProtoTransportation | DetailedTransportation,
  travelTime: number,
  resolution: number,
  properties?: Array<H3FastProtoCellProperty>,
  removeWaterBodies?: boolean,
}

export interface H3FastProtoResponseProperties {
  cells: {
    /**
     * H3 cell indices in their 15-character hexadecimal form.
     */
    ids: Array<string>,
    minTravelTimes?: Array<number>,
    maxTravelTimes?: Array<number>,
    meanTravelTimes?: Array<number>,
  }
}

export interface H3FastProtoResponseError {
  error: {
    type: string
  }
}

export type H3FastProtoResponse = H3FastProtoResponseProperties | H3FastProtoResponseError
