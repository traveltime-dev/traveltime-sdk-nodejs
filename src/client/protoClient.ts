/* eslint-disable class-methods-use-this */
import axios, { AxiosInstance } from 'axios';
import protobuf from 'protobufjs';
import { Coords, Credentials } from '../types';
import {
  TimeFilterFastProtoDistanceRequest, TimeFilterFastProtoRequest, TimeFilterFastProtoResponse, TimeFilterFastProtoTransportation,
} from '../types/proto';
import { RateLimiter, RateLimitSettings } from './rateLimiter';

interface TimeFilterFastProtoMessage {
  oneToManyRequest: {
    departureLocation: Coords
    locationDeltas: Array<number>,
    transportation: {
      type: number
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

export class TravelTimeProtoClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;
  private baseURL: string;
  private protoFileDir = `${__dirname}/proto/v2`;
  private transportationMap: Record<TimeFilterFastProtoTransportation, number> = {
    pt: 0,
    driving: 1,
    'driving+ferry': 3,
    'cycling+ferry': 6,
    'walking+ferry': 7,
  };
  private rateLimiter: RateLimiter;

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
  }

  private encodeFixedPoint(sourcePoint: number, targetPoint: number) {
    return Math.round((targetPoint - sourcePoint) * (10 ** 5));
  }

  private buildRequestUrl(uri: string, { country, transportation }: TimeFilterFastProtoRequest): string {
    return `${uri}/${country}/time-filter/fast/${transportation}`;
  }

  private buildDeltas(departure: Coords, destinations: Array<Coords>) {
    return destinations.flatMap((destination) => [this.encodeFixedPoint(departure.lat, destination.lat), this.encodeFixedPoint(departure.lng, destination.lng)]);
  }

  private buildProtoRequest({
    departureLocation,
    destinationCoordinates,
    transportation,
    travelTime,
  }: TimeFilterFastProtoRequest, options?: ProtoRequestBuildOptions): TimeFilterFastProtoMessage {
    if (!(transportation in this.transportationMap)) {
      throw new Error('Transportation type is not supported');
    }

    return {
      oneToManyRequest: {
        departureLocation,
        locationDeltas: this.buildDeltas(departureLocation, destinationCoordinates),
        transportation: {
          type: this.transportationMap[transportation],
        },
        arrivalTimePeriod: 0,
        travelTime,
        properties: options?.useDistance ? [1] : undefined,
      },
    };
  }

  private async readProtoFile() {
    try {
      return await protobuf.load([
        `${this.protoFileDir}/TimeFilterFastRequest.proto`,
        `${this.protoFileDir}/TimeFilterFastResponse.proto`,
      ]);
    } catch {
      throw new Error(`Could not load proto file at: ${this.protoFileDir}`);
    }
  }

  private async handleProtoFile(
    root: protobuf.Root,
    uri: string,
    request: TimeFilterFastProtoRequest | TimeFilterFastProtoDistanceRequest,
    options?: ProtoRequestBuildOptions,
  ) {
    const TimeFilterFastRequest = root.lookupType('com.igeolise.traveltime.rabbitmq.requests.TimeFilterFastRequest');
    const TimeFilterFastResponse = root.lookupType('com.igeolise.traveltime.rabbitmq.responses.TimeFilterFastResponse');
    const messageRequest = this.buildProtoRequest(request, options);
    const message = TimeFilterFastRequest.create(messageRequest);
    const buffer = TimeFilterFastRequest.encode(message).finish();
    const rq = () => this.axiosInstance.post(this.buildRequestUrl(uri, request), buffer);

    const promise = this.rateLimiter.isEnabled() ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
      this.rateLimiter.addAndExecute(() => resolve(rq()), 1);
    }) : rq();
    const { data } = await promise;
    const response = TimeFilterFastResponse.decode(data);
    return response.toJSON() as TimeFilterFastProtoResponse;
  }

  timeFilterFast = async (request: TimeFilterFastProtoRequest) => this.readProtoFile()
    .then(async (root) => this.handleProtoFile(root, this.baseURL, request));

  timeFilterFastDistance = async (request: TimeFilterFastProtoDistanceRequest) => this.readProtoFile()
    .then(async (root) => this.handleProtoFile(root, this.baseURL, request, { useDistance: true }));

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
