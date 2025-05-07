/* eslint-disable class-methods-use-this */
import axios, { AxiosInstance } from 'axios';
import protobuf from 'protobufjs';
import { Coords, Credentials } from '../types';
import {
    DetailedTransportation,
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

const DEFAULT_BASE_URL = 'http://proto.api.traveltimeapp.com/api/v2';

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
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;
  private baseURL: string;
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
  private rateLimiter: RateLimiter;
  private TimeFilterFastRequest: protobuf.Type;
  private TimeFilterFastResponse: protobuf.Type;

  constructor(
    credentials: Credentials,
    parameters?: { rateLimitSettings?: Partial<RateLimitSettings>, baseUrl?: string },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.baseURL = parameters?.baseUrl || DEFAULT_BASE_URL;
    this.rateLimiter = new RateLimiter(parameters?.rateLimitSettings);
    this.axiosInstance = axios.create({
      auth: {
        username: this.applicationId,
        password: this.apiKey,
      },
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/octet-stream',
        'User-Agent': 'Travel Time Nodejs SDK',
      },
      responseType: 'arraybuffer',
    });

    const root = this.readProtoFile();
    this.TimeFilterFastRequest = root.lookupType('com.igeolise.traveltime.rabbitmq.requests.TimeFilterFastRequest');
    this.TimeFilterFastResponse = root.lookupType('com.igeolise.traveltime.rabbitmq.responses.TimeFilterFastResponse');
  }

  private isDetailedTransportation(transport: any): transport is DetailedTransportation {
    return (
      typeof transport === 'object' && 
        transport !== null && 
        'mode' in transport &&
        (transport.mode === 'pt' || transport.mode === 'driving+pt')
    );
  }

  private encodeFixedPoint(sourcePoint: number, targetPoint: number) {
    return Math.round((targetPoint - sourcePoint) * 100000);
  }

  private buildRequestUrl(uri: string, country: String, transportModeUrlName: string): string {
    return `${uri}/${country}/time-filter/fast/${transportModeUrlName}`;
  }

  private buildDeltas(departure: Coords, destinations: Array<Coords>) {
    return destinations.flatMap((destination) => [this.encodeFixedPoint(departure.lat, destination.lat), this.encodeFixedPoint(departure.lng, destination.lng)]);
  }

  private extractTransportationMode(transportation: TimeFilterFastProtoTransportation | DetailedTransportation): TimeFilterFastProtoTransportation {
    return this.isDetailedTransportation(transportation) ? transportation.mode : transportation;
  }

  private validateTransportationMode(mode: TimeFilterFastProtoTransportation): void {
    if (!(mode in this.transportationMap)) {
      throw new Error('Transportation mode is not supported');
    }
  }

  private extractTransportationDetails(
    transportation: TimeFilterFastProtoTransportation | DetailedTransportation,
    transportationMode: TimeFilterFastProtoTransportation
  ): Record<string, any> | undefined {
    // Return undefined if it's a string or has no details
    if (typeof transportation === 'string' || 
      !this.isDetailedTransportation(transportation) || 
      !transportation.details) {
      return undefined;
    }

    // Verify modes match
    if (transportation.mode !== transportationMode) {
      throw new Error(`Details can only be used with matching transportation type "${transportation.mode}"`);
    }

    if (transportation.mode === 'pt') {
      return {
        publicTransport: {
          walkingTimeToStation: transportation.details.walkingTimeToStation,
        },
      };
    }

    if (transportation.mode === 'driving+pt') {
      return {
        drivingAndPublicTransport: {
          walkingTimeToStation: transportation.details.walkingTimeToStation,
          drivingTimeToStation: transportation.details.drivingTimeToStation,
          parkingTime: transportation.details.parkingTime,
        },
      };
    }

    return undefined;
  }

  private buildProtoRequest({
    country,
    departureLocation,
    destinationCoordinates,
    transportation,
    travelTime,
  }: TimeFilterFastProtoRequest, uri: string, options?: ProtoRequestBuildOptions): TimeFilterProtoMessageWithUrl {
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

    const requestUrl = this.buildRequestUrl(uri, country, transportationConfig.urlName)

    return {
      requestMessage,
      requestUrl
    };
  }

  private readProtoFile() {
    try {
      return protobuf.loadSync([
        `${this.protoFileDir}/TimeFilterFastRequest.proto`,
        `${this.protoFileDir}/TimeFilterFastResponse.proto`,
      ]);
    } catch {
      throw new Error(`Could not load proto file at: ${this.protoFileDir}`);
    }
  }

  private async handleProtoFile(
    uri: string,
    request: TimeFilterFastProtoRequest | TimeFilterFastProtoDistanceRequest,
    options?: ProtoRequestBuildOptions,
  ): Promise<TimeFilterFastProtoResponse> {
    const {requestMessage, requestUrl} = this.buildProtoRequest(request, uri, options);
    const message = this.TimeFilterFastRequest.create(requestMessage);
    const buffer = this.TimeFilterFastRequest.encode(message).finish();

    const rq = () => this.axiosInstance.post(requestUrl, buffer);

    const promise = this.rateLimiter.isEnabled() 
      ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
        this.rateLimiter.addAndExecute(() => resolve(rq()), 1);
      }) 
      : rq();

    const { data } = await promise;
    const response = this.TimeFilterFastResponse.decode(data);
    return response.toJSON() as TimeFilterFastProtoResponse;
  }

  timeFilterFast = async (request: TimeFilterFastProtoRequest) => this.handleProtoFile(this.baseURL, request);

  timeFilterFastDistance = async (request: TimeFilterFastProtoDistanceRequest) => this.handleProtoFile(this.baseURL, request, { useDistance: true });

  setRateLimitSettings = (settings: Partial<RateLimitSettings>) => {
    this.setRateLimitSettings(settings);
  };

  getBaseURL = () => this.baseURL;

  /**
   *
   * @param baseURL Set new base URL. Pass nothing to reset to default
   */
  setBaseURL = (baseURL = DEFAULT_BASE_URL) => {
    this.baseURL = baseURL;
  };

  setCredentials = (credentials: Credentials) => {
    this.apiKey = credentials.apiKey;
    this.applicationId = credentials.applicationId;
  };
}
