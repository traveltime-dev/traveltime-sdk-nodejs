import protobuf from 'protobufjs';
import { Coords, Credentials } from '../types';
import { TravelTimeError, TravelTimeValidationError } from '../error';
import { Transport, TransportRetryOptions } from '../core/transport';
import {
  DetailedTransportation,
  GeohashFastProtoCellProperty,
  GeohashFastProtoRequest,
  GeohashFastProtoResponse,
  TimeFilterFastProtoDistanceRequest, TimeFilterFastProtoRequest, TimeFilterFastProtoResponse, TimeFilterFastProtoTransportation,
} from '../types/proto';
import { RateLimiter, RateLimitSettings } from './rateLimiter';

interface TimeFilterFastProtoMessage {
  oneToManyRequest: {
    departureLocation: Coords
    locationDeltas: Array<number>,
    transportation: {
      type: number,
      publicTransport?: {
        walkingTimeToStation?: number
      },
      drivingAndPublicTransport?: {
        walkingTimeToStation?: number,
        drivingTimeToStation?: number,
        parkingTime?: number
      }
    },
    arrivalTimePeriod: 0,
    travelTime: number,
    properties?: Array<number | undefined>,
  }
}

const DEFAULT_BASE_URL = 'https://proto.api.traveltimeapp.com/api/v3';

interface ProtoRequestBuildOptions {
  useDistance?: boolean
}

interface TransportationConfig {
  code: number;
  urlName: string;
}

interface TimeFilterProtoMessageWithUrl {
  requestMessage: TimeFilterFastProtoMessage,
  requestUrl: string
}

export class TravelTimeProtoClient {
  private transport: Transport;
  private protoFileDir = `${__dirname}/proto/v2`;
  private transportationMap: Record<TimeFilterFastProtoTransportation, TransportationConfig> = {
    pt: { code: 0, urlName: 'pt' },
    'driving+pt': { code: 2, urlName: 'pt' },
    driving: { code: 1, urlName: 'driving' },
    walking: { code: 4, urlName: 'walking' },
    cycling: { code: 5, urlName: 'driving' },
    'driving+ferry': { code: 3, urlName: 'driving+ferry' },
    'cycling+ferry': { code: 6, urlName: 'cycling+ferry' },
    'walking+ferry': { code: 7, urlName: 'walking+ferry' },
  };
  private cellPropertyMap: Record<GeohashFastProtoCellProperty, number> = {
    mean: 0,
    min: 1,
    max: 2,
  };
  private rateLimiter: RateLimiter;
  private TimeFilterFastRequest: protobuf.Type;
  private TimeFilterFastResponse: protobuf.Type;
  private GeohashFastRequest: protobuf.Type;
  private GeohashFastResponse: protobuf.Type;

  constructor(
    credentials: Credentials,
    parameters?: {
      rateLimitSettings?: Partial<RateLimitSettings>,
      baseUrl?: string,
      /** Request timeout in milliseconds. Default `120000`. */
      timeout?: number,
      /** HTTP 429 retry behaviour. On by default, unless the rate limiter is enabled. */
      retry?: TransportRetryOptions,
    },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new TravelTimeValidationError('Credentials must be valid');
    this.rateLimiter = new RateLimiter(parameters?.rateLimitSettings);
    this.transport = new Transport({
      baseURL: parameters?.baseUrl || DEFAULT_BASE_URL,
      auth: { scheme: 'basic', applicationId: credentials.applicationId, apiKey: credentials.apiKey },
      headers: { Accept: 'application/octet-stream' },
      contentType: 'application/octet-stream',
      errorFormat: 'proto',
      timeout: parameters?.timeout,
      retry: { enabled: !this.rateLimiter.isEnabled(), ...parameters?.retry },
    });

    const root = this.readProtoFile();
    this.TimeFilterFastRequest = root.lookupType('com.igeolise.traveltime.rabbitmq.requests.TimeFilterFastRequest');
    this.TimeFilterFastResponse = root.lookupType('com.igeolise.traveltime.rabbitmq.responses.TimeFilterFastResponse');
    this.GeohashFastRequest = root.lookupType('com.igeolise.traveltime.rabbitmq.requests.GeohashFastRequest');
    this.GeohashFastResponse = root.lookupType('com.igeolise.traveltime.rabbitmq.responses.GeohashFastResponse');
  }

  private isDetailedTransportation(transport: any): transport is DetailedTransportation {
    return (
      typeof transport === 'object'
        && transport !== null
        && 'mode' in transport
        && (transport.mode === 'pt' || transport.mode === 'driving+pt')
    );
  }

  private encodeFixedPoint(sourcePoint: number, targetPoint: number) {
    return Math.round((targetPoint - sourcePoint) * 100000);
  }

  private buildRequestUrl(country: string, transportModeUrlName: string): string {
    return `/${country}/time-filter/fast/${transportModeUrlName}`;
  }

  private buildDeltas(departure: Coords, destinations: Array<Coords>) {
    return destinations.flatMap((destination) => [this.encodeFixedPoint(departure.lat, destination.lat), this.encodeFixedPoint(departure.lng, destination.lng)]);
  }

  private extractTransportationMode(transportation: TimeFilterFastProtoTransportation | DetailedTransportation): TimeFilterFastProtoTransportation {
    return this.isDetailedTransportation(transportation) ? transportation.mode : transportation;
  }

  private validateTransportationMode(mode: TimeFilterFastProtoTransportation): void {
    if (!(mode in this.transportationMap)) {
      throw new TravelTimeValidationError('Transportation mode is not supported');
    }
  }

  private extractTransportationDetails(
    transportation: TimeFilterFastProtoTransportation | DetailedTransportation,
    transportationMode: TimeFilterFastProtoTransportation,
  ): Record<string, any> | undefined {
    // Return undefined if it's a string or has no details
    if (typeof transportation === 'string'
      || !this.isDetailedTransportation(transportation)
      || !transportation.details) {
      return undefined;
    }

    // Verify modes match
    if (transportation.mode !== transportationMode) {
      throw new TravelTimeValidationError(`Details can only be used with matching transportation type "${transportation.mode}"`);
    }

    if (transportation.mode === 'pt') {
      const { walkingTimeToStation } = transportation.details;

      if (walkingTimeToStation !== undefined) {
        return {
          publicTransport: {
            walkingTimeToStation: { value: walkingTimeToStation },
          },
        };
      }

      return { publicTransport: {} };
    }

    if (transportation.mode === 'driving+pt') {
      const {
        walkingTimeToStation,
        drivingTimeToStation,
        parkingTime,
      } = transportation.details;

      const drivingAndPublicTransport: Record<string, any> = {};

      if (walkingTimeToStation !== undefined) {
        drivingAndPublicTransport.walkingTimeToStation = { value: walkingTimeToStation };
      }

      if (drivingTimeToStation !== undefined) {
        drivingAndPublicTransport.drivingTimeToStation = { value: drivingTimeToStation };
      }

      if (parkingTime !== undefined) {
        drivingAndPublicTransport.parkingTime = { value: parkingTime };
      }

      return { drivingAndPublicTransport };
    }

    return undefined;
  }

  private buildProtoRequest({
    country,
    departureLocation,
    destinationCoordinates,
    transportation,
    travelTime,
  }: TimeFilterFastProtoRequest, options?: ProtoRequestBuildOptions): TimeFilterProtoMessageWithUrl {
    const transportationMode = this.extractTransportationMode(transportation);
    this.validateTransportationMode(transportationMode);

    const transportationConfig = this.transportationMap[transportationMode];

    const protoTransportationDetails = this.extractTransportationDetails(transportation, transportationMode);

    const requestMessage = {
      oneToManyRequest: {
        departureLocation,
        locationDeltas: this.buildDeltas(departureLocation, destinationCoordinates),
        transportation: {
          type: transportationConfig.code,
          ...protoTransportationDetails,
        },
        arrivalTimePeriod: 0 as const,
        travelTime,
        properties: options?.useDistance ? [1] : undefined,
      },
    };

    const requestUrl = this.buildRequestUrl(country, transportationConfig.urlName);

    return {
      requestMessage,
      requestUrl,
    };
  }

  private buildGeohashRequestUrl(country: string, transportModeUrlName: string): string {
    return `/${country}/geohash/fast/${transportModeUrlName}`;
  }

  private buildGeohashProtoRequest(request: GeohashFastProtoRequest): { requestMessage: Record<string, any>, requestUrl: string } {
    const {
      country, departureLocation, arrivalLocation, transportation, travelTime, resolution, properties,
    } = request;

    if (!departureLocation && !arrivalLocation) {
      throw new TravelTimeValidationError('Either departureLocation or arrivalLocation must be provided');
    }
    if (departureLocation && arrivalLocation) {
      throw new TravelTimeValidationError('Only one of departureLocation or arrivalLocation can be provided');
    }

    const transportationMode = this.extractTransportationMode(transportation);
    this.validateTransportationMode(transportationMode);
    const transportationConfig = this.transportationMap[transportationMode];
    const protoTransportationDetails = this.extractTransportationDetails(transportation, transportationMode);

    const protoProperties = properties?.map((p) => this.cellPropertyMap[p]) ?? [];

    const transportationMessage = {
      type: transportationConfig.code,
      ...protoTransportationDetails,
    };

    const requestMessage: Record<string, any> = {};

    if (departureLocation) {
      requestMessage.oneToManyRequest = {
        departureLocation,
        transportation: transportationMessage,
        arrivalTimePeriod: 0,
        travelTime,
        resolution,
        properties: protoProperties,
      };
    } else {
      requestMessage.manyToOneRequest = {
        arrivalLocation,
        transportation: transportationMessage,
        arrivalTimePeriod: 0,
        travelTime,
        resolution,
        properties: protoProperties,
      };
    }

    const requestUrl = this.buildGeohashRequestUrl(country, transportationConfig.urlName);

    return { requestMessage, requestUrl };
  }

  private readProtoFile() {
    try {
      return protobuf.loadSync([
        `${this.protoFileDir}/TimeFilterFastRequest.proto`,
        `${this.protoFileDir}/TimeFilterFastResponse.proto`,
        `${this.protoFileDir}/GeohashFastRequest.proto`,
        `${this.protoFileDir}/GeohashFastResponse.proto`,
      ]);
    } catch {
      throw new Error(`Could not load proto file at: ${this.protoFileDir}`);
    }
  }

  /**
   * Decodes a proto response body. Decode failures mean the response was
   * received but could not be read, so they are not retryable.
   */
  private decodeProtoResponse<T>(type: protobuf.Type, data: Uint8Array): T {
    try {
      return type.decode(data).toJSON() as T;
    } catch {
      throw new TravelTimeError({ description: 'Could not decode proto response', isRetryable: false });
    }
  }

  private async handleProtoFile(
    request: TimeFilterFastProtoRequest | TimeFilterFastProtoDistanceRequest,
    options?: ProtoRequestBuildOptions,
  ): Promise<TimeFilterFastProtoResponse> {
    try {
      const { requestMessage, requestUrl } = this.buildProtoRequest(request, options);
      const message = this.TimeFilterFastRequest.create(requestMessage);
      const buffer = this.TimeFilterFastRequest.encode(message).finish();

      const rq = () => this.transport.request(requestUrl, { method: 'POST', body: buffer });

      const promise = this.rateLimiter.isEnabled()
        ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
          this.rateLimiter.addAndExecute(() => resolve(rq()), 1);
        })
        : rq();

      const { body } = await promise;
      return this.decodeProtoResponse<TimeFilterFastProtoResponse>(this.TimeFilterFastResponse, body);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  }

  private async handleGeohashProtoFile(
    request: GeohashFastProtoRequest,
  ): Promise<GeohashFastProtoResponse> {
    try {
      const { requestMessage, requestUrl } = this.buildGeohashProtoRequest(request);
      const message = this.GeohashFastRequest.create(requestMessage);
      const buffer = this.GeohashFastRequest.encode(message).finish();

      const rq = () => this.transport.request(requestUrl, { method: 'POST', body: buffer });

      const promise = this.rateLimiter.isEnabled()
        ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
          this.rateLimiter.addAndExecute(() => resolve(rq()), 1);
        })
        : rq();

      const { body } = await promise;
      return this.decodeProtoResponse<GeohashFastProtoResponse>(this.GeohashFastResponse, body);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  }

  timeFilterFast = async (request: TimeFilterFastProtoRequest) => this.handleProtoFile(request);

  timeFilterFastDistance = async (request: TimeFilterFastProtoDistanceRequest) => this.handleProtoFile(request, { useDistance: true });

  geohashFast = async (request: GeohashFastProtoRequest) => this.handleGeohashProtoFile(request);
}
