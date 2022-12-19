/* eslint-disable class-methods-use-this */
import axios, { AxiosInstance } from 'axios';
import protobuf from 'protobufjs';
import { Coords } from '../types';
import {
  TimeFilterFastProtoDistanceRequest, TimeFilterFastProtoRequest, TimeFilterFastProtoResponse, TimeFilterFastProtoTransportation,
} from '../types/proto';

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

interface ProtoRequestBuildOptions {
  useDistance?: boolean
}

export class TravelTimeProtoClient {
  private apiKey: string;

  private applicationId: string;

  private axiosInstance: AxiosInstance;

  private baseUri = 'http://proto.api.traveltimeapp.com/api/v2';

  private protoDistanceUri = 'https://proto-with-distance.api.traveltimeapp.com/api/v2';

  private protoFileDir = `${__dirname}/proto/v2`;

  private transportationMap: Record<TimeFilterFastProtoTransportation, number> = {
    pt: 0,
    'driving+ferry': 3,
    'cycling+ferry': 6,
    'walking+ferry': 7,
  };

  constructor(
    credentials: { apiKey: string, applicationId: string },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
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

    try {
      const { data } = await this.axiosInstance.post(this.buildRequestUrl(uri, request), buffer);
      const response = TimeFilterFastResponse.decode(data);
      return response.toJSON() as TimeFilterFastProtoResponse;
    } catch (e) {
      throw new Error('Error while sending proto request');
    }
  }

  timeFilterFast = async (request: TimeFilterFastProtoRequest) => this.readProtoFile()
    .then(async (root) => this.handleProtoFile(root, this.baseUri, request));

  timeFilterFastDistance = async (request: TimeFilterFastProtoDistanceRequest) => this.readProtoFile()
    .then(async (root) => this.handleProtoFile(root, this.protoDistanceUri, request, { useDistance: true }));
}
