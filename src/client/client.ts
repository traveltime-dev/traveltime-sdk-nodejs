import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TravelTimeError } from '../error';
import {
  MapInfoResponse,
  GeocodingResponse,
  GeocodingReverseRequest,
  GeocodingSearchRequest,
  RoutesRequest,
  RoutesResponse,
  SupportedLocationsResponse,
  SupportedLocationsRequest,
  TimeMapRequest,
  TimeMapResponse,
  TimeFilterRequest,
  TimeFilterResponse,
  TimeFilterFastRequest,
  TimeFilterFastResponse,
  TimeFilterPostcodesRequest,
  TimeFilterPostcodesResponse,
  TimeFilterPostcodeDistrictsRequest,
  TimeFilterPostcodeDistrictsResponse,
  TimeFilterPostcodeSectorsRequest,
  TimeFilterPostcodeSectorsResponse,
  TimeMapResponseVndBoundingBoxes,
  TimeMapResponseVndWkt,
  TimeMapResponseGeoJSON,
} from '../types';

type HttpMethod = 'get' | 'post'

type RequestPayload = {
  body?: any
  config?: AxiosRequestConfig
}

type TimeMapResponseType = {
  'application/json': TimeMapResponse
  'application/vnd.wkt+json': TimeMapResponseVndWkt
  'application/vnd.wkt-no-holes+json': TimeMapResponseVndWkt
  'application/geo+json': TimeMapResponseGeoJSON
  'application/kml+xml': string
  'application/vnd.bounding-boxes+json': TimeMapResponseVndBoundingBoxes
}

export class TravelTimeClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;

  constructor(
    credentials: { apiKey: string, applicationId: string },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.traveltimeapp.com/v4',
      headers: {
        'Content-Type': 'application/json',
        'X-Application-Id': this.applicationId,
        'X-Api-Key': this.apiKey,
      },
    });
  }

  private async request<Response>(url: string, method: HttpMethod, payload?: RequestPayload) {
    const { body, config } = payload!;
    try {
      const { data } = await (method === 'get' ? this.axiosInstance[method]<Response>(url, config) : this.axiosInstance[method]<Response>(url, body, config));
      return data;
    } catch (error) {
      throw TravelTimeError.makeError(error);
    }
  }

  async geocoding(query: string, req?: GeocodingSearchRequest) {
    const { acceptLanguage, params } = req || {};
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.request<GeocodingResponse>('/geocoding/search', 'get', { config: { params: { ...params, query }, headers } });
  }

  async geocodingReverse({ acceptLanguage, params }: GeocodingReverseRequest) {
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.request<GeocodingResponse>('/geocoding/reverse', 'get', { config: { params, headers } });
  }

  mapInfo = async () => this.request<MapInfoResponse>('/map-info', 'get');

  routes = async (body: RoutesRequest) => this.request<RoutesResponse>('/routes', 'post', { body });

  supportedLocations = async (body: SupportedLocationsRequest) => this.request<SupportedLocationsResponse>('/supported-locations', 'post', { body });

  timeFilter = async (body: TimeFilterRequest) => this.request<TimeFilterResponse>('/time-filter', 'post', { body });

  timeFilterFast = async (body: TimeFilterFastRequest) => this.request<TimeFilterFastResponse>('/time-filter/fast', 'post', { body });

  timeFilterPostcodeDistricts = async (body: TimeFilterPostcodeDistrictsRequest) => this
    .request<TimeFilterPostcodeDistrictsResponse>('/time-filter/postcode-districts', 'post', { body });

  timeFilterPostcodeSectors = async (body: TimeFilterPostcodeSectorsRequest) => this
    .request<TimeFilterPostcodeSectorsResponse>('/time-filter/postcode-sectors', 'post', { body });

  timeFilterPostcodes = async (body: TimeFilterPostcodesRequest) => this.request<TimeFilterPostcodesResponse>('/time-filter/postcodes', 'post', { body });

  // eslint-disable-next-line no-unused-vars
  async timeMap(body: TimeMapRequest): Promise<TimeMapResponse>
  // eslint-disable-next-line no-dupe-class-members, no-unused-vars
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format: T): Promise<TimeMapResponseType[T]>
  // eslint-disable-next-line no-dupe-class-members
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map', 'post', { body, config: { headers } });
  }
}
