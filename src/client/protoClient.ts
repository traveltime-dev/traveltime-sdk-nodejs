import axios, { AxiosInstance } from 'axios';
import protobuf from 'protobufjs';
import { Coords } from '../types';
import { TimeFilterFastProtoRequest, TimeFilterFastProtoResponse, TimeFilterFastProtoTransportation } from '../types/proto';

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

export class TravelTimeProtoClient {
  private apiKey: string;

  private applicationId: string;

  private axiosInstance: AxiosInstance;

  private baseUri = 'http://proto.api.traveltimeapp.com/api/v2';

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
        username: this.apiKey,
        password: this.applicationId,
      },
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Application-Id': this.applicationId,
        'X-Api-Key': this.apiKey,
        Accept: 'application/octet-stream',
      },
      responseType: 'arraybuffer',
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private encodeFixedPoint(sourcePoint: number, targetPoint: number) {
    return Math.round((targetPoint - sourcePoint) * 1000000);
  }

  private buildRequestUrl({ country, transportation }: TimeFilterFastProtoRequest): string {
    return `${this.baseUri}/${country}/time-filter/fast/${transportation}`;
  }

  private buildDeltas(departure: Coords, destinations: Array<Coords>) {
    return destinations.map((destination) => [
      this.encodeFixedPoint(departure.lat, destination.lat),
      this.encodeFixedPoint(departure.lng, destination.lng),
    ]).reduce((prev, cur) => [...prev, ...cur], []);
  }

  private buildProtoRequest({
    departureLocation,
    destinationCoordinates,
    transportation,
    travelTime,
    properties,
  }: TimeFilterFastProtoRequest): TimeFilterFastProtoMessage {
    if (!(transportation in this.transportationMap)) {
      throw new Error('Transportation type is not supported');
    }

    const fares = properties?.fares ? 0 : undefined;
    const distances = properties?.distances ? 1 : undefined;

    return {
      oneToManyRequest: {
        departureLocation,
        locationDeltas: this.buildDeltas(departureLocation, destinationCoordinates),
        transportation: {
          type: this.transportationMap[transportation],
        },
        arrivalTimePeriod: 0,
        travelTime,
        properties: [fares, distances].filter((x) => x !== undefined),
      },
    };
  }

  timeFilterFast = async (request: TimeFilterFastProtoRequest) => protobuf.load([
    `${process.cwd()}/src/proto/TimeFilterFastRequest.proto`,
    `${process.cwd()}/src/proto/TimeFilterFastResponse.proto`,
  ])
    .then(async (root) => {
      const TimeFilterFastRequest = root.lookupType('com.igeolise.traveltime.rabbitmq.requests.TimeFilterFastRequest');
      const TimeFilterFastResponse = root.lookupType('com.igeolise.traveltime.rabbitmq.responses.TimeFilterFastResponse');
      const messageRequest = this.buildProtoRequest(request);
      const message = TimeFilterFastRequest.create(messageRequest);
      const buffer = TimeFilterFastRequest.encode(message).finish();

      try {
        const { data } = await this.axiosInstance.post(this.buildRequestUrl(request), buffer);
        const response = TimeFilterFastResponse.decode(data);
        return response.toJSON() as TimeFilterFastProtoResponse;
      } catch (e) {
        throw new Error('Error while sending proto request');
      }
    })
    .catch(() => {
      throw new Error("Proto file couldn't be loaded");
    });
}
