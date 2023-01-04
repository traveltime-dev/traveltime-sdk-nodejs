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
  TimeMapFastRequest,
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

const DEFAULT_BASE_URL = 'https://api.traveltimeapp.com/v4';

export class TravelTimeClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;

  constructor(
    credentials: { apiKey: string, applicationId: string },
    parameters?: { baseURL?: string },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.axiosInstance = axios.create({
      baseURL: parameters?.baseURL ?? DEFAULT_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Application-Id': this.applicationId,
        'X-Api-Key': this.apiKey,
        'User-Agent': 'Travel Time Nodejs SDK',
      },
    });
  }

  private async request<Response>(url: string, method: HttpMethod, payload?: RequestPayload) {
    const { body, config } = payload || {};
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
    const bounds = params?.bounds ? `${params.bounds.southEast.lat},${params.bounds.southEast.lng},${params.bounds.northWest.lat},${params.bounds.northWest.lng}` : undefined;
    return this.request<GeocodingResponse>('/geocoding/search', 'get', { config: { params: { ...params, bounds, query }, headers } });
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

  async timeMap(body: TimeMapRequest): Promise<TimeMapResponse>
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format: T): Promise<TimeMapResponseType[T]>
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map', 'post', { body, config: { headers } });
  }

  async timeMapFast(body: TimeMapFastRequest): Promise<TimeMapResponse>
  async timeMapFast<T extends keyof TimeMapResponseType>(body: TimeMapFastRequest, format: T): Promise<TimeMapResponseType[T]>
  async timeMapFast<T extends keyof TimeMapResponseType>(body: TimeMapFastRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map/fast', 'post', { body, config: { headers } });
  }

  getBaseURL = () => this.axiosInstance.defaults.baseURL;

  /**
   *
   * @param baseURL Set new base URL. Pass nothing to reset to default
   */
  setBaseURL = (baseURL = DEFAULT_BASE_URL) => {
    this.axiosInstance.defaults.baseURL = baseURL;
  };
}
