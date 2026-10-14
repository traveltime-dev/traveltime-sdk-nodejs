import { protoCountries } from '../client/proto/countries';
import { Coords } from './common';

/** Transportation modes supported by `timeFilterFastDistance`, which excludes public transport. */
export type TimeFilterFastProtoDistanceTransportation = 'driving+ferry' | 'walking+ferry' | 'driving' | 'walking' | 'cycling' | 'cycling+ferry'
/** Transportation modes of the proto endpoints. `pt` is public transport, `driving+pt` is driving then public transport. */
export type TimeFilterFastProtoTransportation = 'pt' | 'driving+pt' | TimeFilterFastProtoDistanceTransportation;
/** Country code of a country the proto endpoints support. Matched case-insensitively. */
export type TimeFilterFastProtoCountry = typeof protoCountries[number]
/** Country code of a country `timeFilterFastDistance` supports. */
export type TimeFilterFastProtoDistanceCountry = TimeFilterFastProtoCountry

export interface TimeFilterFastProtoProperties {
  fares?: boolean,
  distances?: boolean
}

/** Overrides for the `pt` transportation mode. */
export interface PublicTransportDetails {
  /**
   * Limit on walking path duration, in seconds. Must be > 0 and <= 1800.
   * Does not override the overall travel time limit.
   */
  walkingTimeToStation?: number;
}

/** Overrides for the `driving+pt` transportation mode. */
export interface DrivingAndPublicTransportDetails {
  /**
   * Limit on walking path duration, in seconds. Must be > 0 and <= 1800.
   * Does not override the overall travel time limit.
   */
  walkingTimeToStation?: number;
  /**
   * Limit on driving path duration, in seconds. Must be > 0 and <= 1800.
   * Does not override the overall travel time limit.
   */
  drivingTimeToStation?: number;
  /**
   * Constant penalty in seconds to simulate finding a parking spot. Must be non-negative and at most the travel time limit. Default `300`.
   */
  parkingTime?: number; }

/** A `pt` or `driving+pt` mode with optional overrides; `details` must match `mode`. */
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

/** Request of the proto `timeFilterFast` and `timeFilterFastFares`. */
export type TimeFilterFastProtoRequest = ProtoLocation & {
  /** Country the search runs in. */
  country: TimeFilterFastProtoCountry
  /**
   * The many points of the search. With `arrivalLocation` these are the departure points.
   * There is no fixed limit; a request can be up to 10MB (around 2 million locations).
   */
  destinationCoordinates: Array<Coords>,
  /** Transportation mode, or `pt` / `driving+pt` with overrides. */
  transportation: TimeFilterFastProtoTransportation | DetailedTransportation,
  /** Maximum journey time in seconds. */
  travelTime: number,
}

/** Request of the proto `timeFilterFastDistance`. */
export type TimeFilterFastProtoDistanceRequest = ProtoLocation & {
  /** Country the search runs in. */
  country: TimeFilterFastProtoDistanceCountry
  /**
   * The many points of the search. With `arrivalLocation` these are the departure points.
   * There is no fixed limit; a request can be up to 10MB (around 2 million locations).
   */
  destinationCoordinates: Array<Coords>,
  /** Transportation mode; public transport modes are not supported. */
  transportation: TimeFilterFastProtoDistanceTransportation,
  /** Maximum journey time in seconds. */
  travelTime: number,
}

/** Response of the proto `timeFilterFast`. */
export interface TimeFilterFastProtoResponseProperties {
  /** Per-destination results. */
  properties: {
    /** Travel time in seconds to each point of `destinationCoordinates`, in the same order. */
    travelTimes: Array<number>
  }
}

/** Response of the proto `timeFilterFastDistance`. */
export interface TimeFilterFastProtoDistanceResponseProperties {
  /** Per-destination results. */
  properties: {
    /** Travel time in seconds to each point of `destinationCoordinates`, in the same order. */
    travelTimes: Array<number>,
    /** Distance in meters to each point of `destinationCoordinates`, in the same order. */
    distances: Array<number>
  }
}

/** Response of the proto `timeFilterFastFares`. */
export interface TimeFilterFastProtoFaresResponseProperties {
  /** Per-destination results. */
  properties: {
    /** Travel time in seconds to each point of `destinationCoordinates`, in the same order. */
    travelTimes: Array<number>,
    /** Monthly fare to each point of `destinationCoordinates`, in the same order. */
    monthlyFares: Array<number>
  }
}

/** Error carried in a proto response body. */
export interface TimeFilterFastProtoResponseError {
  /** Error details. */
  error: {
    /**
     * Error type name, e.g. `"TOO_MANY_REQUESTS"`. Absent when the API sends
     * the enum's zero value (`UNKNOWN`), which proto3 does not put on the wire.
     */
    type?: string
  }
}

/** Response of the proto Time Filter (Fast) methods. */
export type TimeFilterFastProtoResponse = TimeFilterFastProtoResponseProperties | TimeFilterFastProtoDistanceResponseProperties | TimeFilterFastProtoFaresResponseProperties | TimeFilterFastProtoResponseError

/** Transportation modes of the proto `geohashFast`. */
export type GeohashFastProtoTransportation = TimeFilterFastProtoTransportation;
/** Country code of a country the proto `geohashFast` supports. */
export type GeohashFastProtoCountry = TimeFilterFastProtoCountry;

/** Travel time statistics the proto `geohashFast` can return for each cell. */
export type GeohashFastProtoCellProperty = 'min' | 'max' | 'mean';

/** Request of the proto `geohashFast`. */
export type GeohashFastProtoRequest = ProtoLocation & {
  /** Country the search runs in. */
  country: GeohashFastProtoCountry
  /** Transportation mode, or `pt` / `driving+pt` with overrides. */
  transportation: GeohashFastProtoTransportation | DetailedTransportation,
  /** Maximum journey time in seconds. The maximum depends on `resolution`. */
  travelTime: number,
  /** Geohash resolution (cell size). Same limits as Geohash (Fast). */
  resolution: number,
  /** Travel time statistics to return for each cell. */
  properties?: Array<GeohashFastProtoCellProperty>,
  /** When `true` (the API default), returned cells will not cover large nearby water bodies. */
  removeWaterBodies?: boolean,
}

/** Response of the proto `geohashFast`. */
export interface GeohashFastProtoResponseProperties {
  /** Reachable cells, as parallel arrays. */
  cells: {
    /** Geohashes of the reachable cells. */
    ids: Array<string>,
    /** Minimum travel time in seconds for each cell in `ids`. */
    minTravelTimes?: Array<number>,
    /** Maximum travel time in seconds for each cell in `ids`. */
    maxTravelTimes?: Array<number>,
    /** Mean travel time in seconds for each cell in `ids`. */
    meanTravelTimes?: Array<number>,
  }
}

/** Response of the proto `geohashFast`. */
export type GeohashFastProtoResponse = GeohashFastProtoResponseProperties

/** Transportation modes of the proto `h3Fast`. */
export type H3FastProtoTransportation = TimeFilterFastProtoTransportation;
/** Country code of a country the proto `h3Fast` supports. */
export type H3FastProtoCountry = TimeFilterFastProtoCountry;

/** Travel time statistics the proto `h3Fast` can return for each cell. */
export type H3FastProtoCellProperty = 'min' | 'max' | 'mean';

/** Request of the proto `h3Fast`. */
export type H3FastProtoRequest = ProtoLocation & {
  /** Country the search runs in. */
  country: H3FastProtoCountry
  /** Transportation mode, or `pt` / `driving+pt` with overrides. */
  transportation: H3FastProtoTransportation | DetailedTransportation,
  /** Maximum journey time in seconds. The maximum depends on `resolution`. */
  travelTime: number,
  /** H3 resolution (cell size). Same limits as H3 (Fast). */
  resolution: number,
  /** Travel time statistics to return for each cell. */
  properties?: Array<H3FastProtoCellProperty>,
  /** When `true` (the API default), returned cells will not cover large nearby water bodies. */
  removeWaterBodies?: boolean,
}

/** Response of the proto `h3Fast`. */
export interface H3FastProtoResponseProperties {
  /** Reachable cells, as parallel arrays. */
  cells: {
    /**
     * H3 cell indices in their 15-character hexadecimal form.
     */
    ids: Array<string>,
    /** Minimum travel time in seconds for each cell in `ids`. */
    minTravelTimes?: Array<number>,
    /** Maximum travel time in seconds for each cell in `ids`. */
    maxTravelTimes?: Array<number>,
    /** Mean travel time in seconds for each cell in `ids`. */
    meanTravelTimes?: Array<number>,
  }
}

/** Response of the proto `h3Fast`. */
export type H3FastProtoResponse = H3FastProtoResponseProperties
