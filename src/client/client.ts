import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TravelTimeError } from '../error';
import {
  MapInfoResponse,
  GeocodingResponse,
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
  TimeMapFastRequest,
  Coords,
  Credentials,
  BatchedResponse,
  TimeMapSimple,
  TimeMapFastSimple,
  TimeFilterSimple,
  TimeFilterFastSimple,
  RoutesSimple,
} from '../types';
import { TimeMapFastResponseType, TimeMapResponseType } from '../types/timeMapResponse';
import { RateLimiter, RateLimitSettings } from './rateLimiter';
import {
  routesSimpleToRequest,
  timeFilterFastSimpleToRequest,
  timeFilterSimpleToRequest,
  timeMapFastSimpleToRequest,
  timeMapSimpleToRequest,
} from './mapper';

type HttpMethod = 'get' | 'post'

type RequestPayload = {
  body?: any
  config?: AxiosRequestConfig
}

const DEFAULT_BASE_URL = 'https://api.traveltimeapp.com/v4';
const sdkVersion = require('../../package.json').version;

function getHitAmountFromRequest(url: string, body: RequestPayload['body']) {
  switch (url) {
    case '/time-filter':
    case '/routes':
    case '/time-filter/postcode-districts':
    case '/time-filter/postcode-sectors':
    case '/time-filter/postcodes': {
      return (body.departure_searches?.length || 0) + (body.arrival_searches?.length || 0);
    }
    case '/time-map/fast':
    case '/time-filter/fast': {
      return (body.arrival_searches.one_to_many?.length || 0) + (body.arrival_searches.many_to_one?.length || 0);
    }
    case '/time-map': {
      return (body.departure_searches?.length || 0) + (body.arrival_searches?.length || 0) + (body.unions?.length || 0) + (body.intersections?.length || 0);
    }
    default: return 0;
  }
}

function endpointChecksHPM(url: string) {
  return [
    '/time-filter',
    '/routes',
    '/time-filter/postcode-districts',
    '/time-filter/postcode-sectors',
    '/time-filter/postcodes',
    '/time-map/fast',
    '/time-filter/fast',
    '/time-map',
  ].includes(url);
}

export class TravelTimeClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(
    credentials: Credentials,
    parameters?: { baseURL?: string, rateLimitSettings?: Partial<RateLimitSettings> },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.rateLimiter = new RateLimiter(parameters?.rateLimitSettings);
    this.axiosInstance = axios.create({
      baseURL: parameters?.baseURL ?? DEFAULT_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Application-Id': this.applicationId,
        'X-Api-Key': this.apiKey,
        'User-Agent': `Travel Time Nodejs SDK ${sdkVersion}`,
      },
    });
  }

  private async request<Response>(url: string, method: HttpMethod, payload?: RequestPayload, retryCount = 0): Promise<Response> {
    const { body, config } = payload || {};
    const rq = () => (method === 'get' ? this.axiosInstance[method]<Response>(url, config) : this.axiosInstance[method]<Response>(url, body, config));
    try {
      const promise = (this.rateLimiter.isEnabled() && endpointChecksHPM(url)) ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
        this.rateLimiter.addAndExecute(() => resolve(rq()), getHitAmountFromRequest(url, body || {}));
      }) : rq();
      const { data } = await promise;
      return data;
    } catch (error) {
      if (this.rateLimiter.isEnabled() && retryCount < 3 && axios.isAxiosError(error) && error.response?.status === 429) {
        return this.request(url, method, payload, retryCount + 1);
      }
      throw TravelTimeError.makeError(error);
    }
  }

  async geocoding(query: string, req?: GeocodingSearchRequest) {
    const { acceptLanguage, params } = req || {};
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    const bounds = params?.bounds ? `${params.bounds.southEast.lat},${params.bounds.southEast.lng},${params.bounds.northWest.lat},${params.bounds.northWest.lng}` : undefined;
    const withinCountry = Array.isArray(params?.['within.country']) ? params?.['within.country'].join(',') : params?.['within.country'];
    return this.request<GeocodingResponse>('/geocoding/search', 'get', {
      config: {
        params: {
          ...params, 'within.country': withinCountry, bounds, query,
        },
        headers,
      },
    });
  }

  async geocodingReverse(coords: Coords, acceptLanguage?: string) {
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.request<GeocodingResponse>('/geocoding/reverse', 'get', { config: { params: coords, headers } });
  }

  mapInfo = async () => this.request<MapInfoResponse>('/map-info', 'get');

  routes = async (body: RoutesRequest) => this.request<RoutesResponse>('/routes', 'post', { body });

  /**
   * Simplified version of routes.
   * Allows you to pass multiple coordinates with same params for routes to be made.
   * @param {RoutesSimple} body Simplified RoutesRequest type. Default search type is `departure`.
   */
  routesSimple = async (body: RoutesSimple) => this.routes(routesSimpleToRequest(body));

  supportedLocations = async (body: SupportedLocationsRequest) => this.request<SupportedLocationsResponse>('/supported-locations', 'post', { body });

  timeFilter = async (body: TimeFilterRequest) => this.request<TimeFilterResponse>('/time-filter', 'post', { body });

  /**
   * Simplified version of timeFilter.
   * Allows you to pass multiple coordinates with same params for matrixes to be made.
   * @param {TimeFilterSimple} body Simplified TimeFilterRequest type. Default search type is `departure`.
   */
  timeFilterSimple = async (body: TimeFilterSimple) => this.timeFilter(timeFilterSimpleToRequest(body));

  timeFilterFast = async (body: TimeFilterFastRequest) => this.request<TimeFilterFastResponse>('/time-filter/fast', 'post', { body });

  /**
   * Simplified version of timeFilterFast.
   * Allows you to pass multiple coordinates with same params for matrixes to be made.
   * @param {TimeFilterFastSimple} body Simplified TimeFilterFastRequest. Default search type is `one_to_many`. Default properties are `['travel_time']`.
   */
  timeFilterFastSimple = async (body: TimeFilterFastSimple) => this.timeFilterFast(timeFilterFastSimpleToRequest(body));

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

  /**
   * Simplified version of timeMap.
   * Allows you to pass multiple coordinates with same params for isochrones to be made.
   * @param {TimeMapSimple} body Simplified TimeMapRequest. Default search type is `departure`.
   * @param {keyof TimeMapResponseType} [format] Specify in which format response should be returned. Supported formats can be found - https://docs.traveltime.com/api/reference/isochrones#Response-Body
   */
  async timeMapSimple(body: TimeMapSimple): Promise<TimeMapResponse>
  async timeMapSimple<T extends keyof TimeMapResponseType>(body: TimeMapSimple, format: T): Promise<TimeMapResponseType[T]>
  async timeMapSimple<T extends keyof TimeMapResponseType>(body: TimeMapSimple, format?: T) {
    const request = timeMapSimpleToRequest(body);
    return this.timeMap(request, format as T);
  }

  async timeMapFast(body: TimeMapFastRequest): Promise<TimeMapResponse>
  async timeMapFast<T extends keyof TimeMapFastResponseType>(body: TimeMapFastRequest, format: T): Promise<TimeMapFastResponseType[T]>
  async timeMapFast<T extends keyof TimeMapFastResponseType>(body: TimeMapFastRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map/fast', 'post', { body, config: { headers } });
  }

  /**
   * Simplified version of timeMapFast.
   * Allows you to pass multiple coordinates with same params for isochrones to be made.
   * @param {TimeMapFastSimple} body Simplified TimeMapFastRequest. Default search type is `one_to_many`.
   * @param {keyof TimeMapResponseType} [format] Specify in which format response should be returned. Supported formats are same as in time map.
   */
  async timeMapFastSimple(body: TimeMapFastSimple): Promise<TimeMapResponse>
  async timeMapFastSimple<T extends keyof TimeMapFastResponseType>(body: TimeMapFastSimple, format: T): Promise<TimeMapFastResponseType[T]>
  async timeMapFastSimple<T extends keyof TimeMapFastResponseType>(body: TimeMapFastSimple, format?: T) {
    const request = timeMapFastSimpleToRequest(body);
    return this.timeMapFast(request, format as T);
  }

  async timeMapBatch(
    bodies: TimeMapRequest[],
    chunkSize?: number,
  ): Promise<BatchedResponse<TimeMapResponse>>
  async timeMapBatch<T extends keyof TimeMapResponseType>(
    bodies: TimeMapRequest[],
    format?: T,
    chunkSize?: number,
  ): Promise<BatchedResponse<TimeMapResponseType[T]>>
  async timeMapBatch<T extends keyof TimeMapResponseType>(
    bodies: TimeMapRequest[],
    format: T,
    chunkSize?: number,
  ): Promise<BatchedResponse<TimeMapResponseType[T]>> {
    const responses: TimeMapResponseType[T][] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < bodies.length; i += chunkSize || 10) {
      const chunk = bodies.slice(i, i + (chunkSize || 10));
      const promises = chunk.map((body) => this.timeMap(body, format));

      // eslint-disable-next-line no-await-in-loop
      const chunkResults = await Promise.allSettled(promises);
      chunkResults.forEach((chunkResult, index) => {
        if (chunkResult.status === 'rejected') {
          errors.push({ index: i + index, error: chunkResult.reason });
        } else {
          responses.push(chunkResult.value);
        }
      });
    }

    return {
      responses,
      errors,
    };
  }

  getBaseURL = () => this.axiosInstance.defaults.baseURL;

  /**
   *
   * @param baseURL Set new base URL. Pass nothing to reset to default
   */
  setBaseURL = (baseURL = DEFAULT_BASE_URL) => {
    this.axiosInstance.defaults.baseURL = baseURL;
  };

  setRateLimitSettings = (settings: Partial<RateLimitSettings>) => {
    this.setRateLimitSettings(settings);
  };

  setCredentials = (credentials: Credentials) => {
    this.apiKey = credentials.apiKey;
    this.applicationId = credentials.applicationId;
  };
}
