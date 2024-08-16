import axios, {
  AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults,
} from 'axios';
import HttpAgent, { HttpsAgent } from 'agentkeepalive';
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
  TimeMapSimple,
  TimeMapFastSimple,
  TimeFilterSimple,
  TimeFilterFastSimple,
  RoutesSimple,
  BatchResponse,
  GenericFunction,
  DistanceMapRequest,
  DistanceMapResponseType,
  DistanceMapResponse,
  DistanceMapSimple,
} from '../types';
import { TimeMapFastResponseType, TimeMapResponseType } from '../types/timeMapResponse';
import { RateLimiter, RateLimitSettings } from './rateLimiter';
import {
  distanceMapSimpleToRequest,
  routesSimpleToRequest,
  timeFilterFastManyToManyMatrixResponseMapper,
  timeFilterFastManyToManyMatrixToRequest,
  timeFilterFastSimpleToRequest,
  timeFilterSimpleToRequest,
  timeMapFastSimpleToRequest,
  timeMapSimpleToRequest,
} from './mapper';
import { TimeFilterFastManyToManyMatrixRequest } from '../types/timeFilterMatrix';

type HttpMethod = 'get' | 'post'

type RequestPayload = {
  body?: any
  config?: AxiosRequestConfig
}

const DEFAULT_BASE_URL = 'https://api.traveltimeapp.com/v4';
const sdkVersion = require('../../package.json').version;

const defaultHttpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 100 });
const defaultHttpAgent = new HttpAgent({ keepAlive: true, maxSockets: 100 });

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
    case '/distance-map':
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
    '/distance-map',
  ].includes(url);
}

export class TravelTimeClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(
    credentials: Credentials,
    parameters?: {
      baseURL?: string,
      rateLimitSettings?: Partial<RateLimitSettings>,
      axiosInstance?: AxiosInstance
    },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.rateLimiter = new RateLimiter(parameters?.rateLimitSettings);
    const headers: CreateAxiosDefaults['headers'] = {
      'Content-Type': 'application/json',
      'X-Application-Id': this.applicationId,
      'X-Api-Key': this.apiKey,
      'User-Agent': `Travel Time Nodejs SDK ${sdkVersion}`,
    };
    if (parameters?.axiosInstance) {
      this.axiosInstance = parameters.axiosInstance;
      if (!this.axiosInstance.defaults.baseURL) this.axiosInstance.defaults.baseURL = parameters?.baseURL ?? DEFAULT_BASE_URL;
      this.axiosInstance.defaults.headers.common = {
        ...headers,
        ...this.axiosInstance.defaults.headers.common,
      };
    } else {
      this.axiosInstance = axios.create({
        baseURL: parameters?.baseURL ?? DEFAULT_BASE_URL,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        httpAgent: defaultHttpAgent,
        httpsAgent: defaultHttpsAgent,
        headers: {
          common: headers,
        },
      });
    }
  }

  private async request<Response>(url: string, method: HttpMethod, payload?: RequestPayload, retryCount = 0): Promise<Response> {
    const { body, config } = payload || {};
    const rq = () => (method === 'get' ? this.axiosInstance[method]<Response>(url, config) : this.axiosInstance[method]<Response>(url, body, config));
    try {
      const promise = (this.rateLimiter.isEnabled() && endpointChecksHPM(url)) ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
        this.rateLimiter.addAndExecute(() => resolve(rq()), getHitAmountFromRequest(url, body || {}), retryCount > 0);
      }) : rq();
      const { data } = await promise;
      return data;
    } catch (error) {
      if (this.rateLimiter.isEnabled() && retryCount < this.rateLimiter.getRetryCount() && axios.isAxiosError(error) && error.response?.status === 429) {
        return new Promise((resolve) => {
          this.rateLimiter.setIsSleeping(true);
          setTimeout(() => {
            this.rateLimiter.setIsSleeping(false);
            resolve(this.request(url, method, payload, retryCount + 1));
          }, this.rateLimiter.getTimeBetweenRetries());
        });
      }
      throw TravelTimeError.makeError(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async batch<T extends GenericFunction, R extends Awaited<ReturnType<T>>>(
    requestFn: T,
    bodies: Parameters<T>[0][],
  ): Promise<BatchResponse<R>[]> {
    const results: BatchResponse<R>[] = [];

    const chunkResults = await Promise.allSettled(bodies.map((request) => requestFn(request)));
    chunkResults.forEach((chunkResult) => {
      if (chunkResult.status === 'rejected') {
        results.push({ type: 'error', error: chunkResult.reason });
      } else {
        results.push({ type: 'success', body: chunkResult.value });
      }
    });

    return results;
  }

  async distanceMap(body: DistanceMapRequest): Promise<DistanceMapResponse>
  async distanceMap<T extends keyof DistanceMapResponseType>(body: DistanceMapRequest, format: T): Promise<DistanceMapResponseType[T]>
  async distanceMap<T extends keyof DistanceMapResponseType>(body: DistanceMapRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/distance-map', 'post', { body, config: { headers } });
  }

  async distanceMapBatch(
    bodies: DistanceMapRequest[],
  ): Promise<BatchResponse<Awaited<DistanceMapResponse>>[]>
  async distanceMapBatch<T extends keyof DistanceMapResponseType>(
    bodies: DistanceMapRequest[],
    format: T,
  ): Promise<BatchResponse<Awaited<DistanceMapResponseType[T]>>[]>
  async distanceMapBatch<T extends keyof DistanceMapResponseType>(
    bodies: DistanceMapRequest[],
    format?: T,
  ): Promise<BatchResponse<Awaited<DistanceMapResponseType[T]>>[]> {
    return this.batch((body: DistanceMapRequest) => this.distanceMap(body, format as T), bodies);
  }

  /**
   * Simplified version of distanceMap.
   * Allows you to pass multiple coordinates with same params for shape to be made.
   * @param {DistanceMapSimple} body Simplified DistanceMapRequest. Default search type is `departure`.
   * @param {keyof DistanceMapResponseType} [format] Specify in which format response should be returned.
   */
  async distanceMapSimple(body: DistanceMapSimple): Promise<TimeMapResponse>
  async distanceMapSimple<T extends keyof DistanceMapResponseType>(body: DistanceMapSimple, format: T): Promise<DistanceMapResponseType[T]>
  async distanceMapSimple<T extends keyof DistanceMapResponseType>(body: DistanceMapSimple, format?: T) {
    const request = distanceMapSimpleToRequest(body);
    return this.distanceMap(request, format as T);
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
  geocodingBatch = async (requests: string[], req?: GeocodingSearchRequest) => this.batch((coords) => this.geocoding(coords, req), requests);

  async geocodingReverse(coords: Coords, acceptLanguage?: string) {
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.request<GeocodingResponse>('/geocoding/reverse', 'get', { config: { params: coords, headers } });
  }
  geocodingReverseBatch = async (requests: Coords[], acceptLanguage?: string) => this.batch((coords) => this.geocodingReverse(coords, acceptLanguage), requests);

  mapInfo = async () => this.request<MapInfoResponse>('/map-info', 'get');

  routes = async (body: RoutesRequest) => this.request<RoutesResponse>('/routes', 'post', { body });
  routesBatch = async (requests: RoutesRequest[]) => this.batch(this.routes, requests);

  /**
   * Simplified version of routes.
   * Allows you to pass multiple coordinates with same params for routes to be made.
   * @param {RoutesSimple} body Simplified RoutesRequest type. Default search type is `departure`.
   */
  routesSimple = async (body: RoutesSimple) => this.routes(routesSimpleToRequest(body));

  supportedLocations = async (body: SupportedLocationsRequest) => this.request<SupportedLocationsResponse>('/supported-locations', 'post', { body });

  timeFilter = async (body: TimeFilterRequest) => this.request<TimeFilterResponse>('/time-filter', 'post', { body });
  timeFilterBatch = async (requests: TimeFilterRequest[]) => this.batch(this.timeFilter, requests);

  /**
   * Simplified version of timeFilter.
   * Allows you to pass multiple coordinates with same params for matrixes to be made.
   * @param {TimeFilterSimple} body Simplified TimeFilterRequest type. Default search type is `departure`.
   */
  timeFilterSimple = async (body: TimeFilterSimple) => this.timeFilter(timeFilterSimpleToRequest(body));

  timeFilterFast = async (body: TimeFilterFastRequest) => this.request<TimeFilterFastResponse>('/time-filter/fast', 'post', { body });
  timeFilterFastBatch = async (requests: TimeFilterFastRequest[]) => this.batch(this.timeFilterFast, requests);
  manyToManyMatrixFast = async (body: TimeFilterFastManyToManyMatrixRequest) => {
    const requests = timeFilterFastManyToManyMatrixToRequest(body);
    const responses = await this.timeFilterFastBatch(requests);
    return timeFilterFastManyToManyMatrixResponseMapper(responses, body.coordsFrom.length, body.coordsTo.length, body.properties || ['travel_time']);
  };

  /**
   * Simplified version of timeFilterFast.
   * Allows you to pass multiple coordinates with same params for matrixes to be made.
   * @param {TimeFilterFastSimple} body Simplified TimeFilterFastRequest. Default search type is `one_to_many`. Default properties are `['travel_time']`.
   */
  timeFilterFastSimple = async (body: TimeFilterFastSimple) => this.timeFilterFast(timeFilterFastSimpleToRequest(body));

  timeFilterPostcodeDistricts = async (body: TimeFilterPostcodeDistrictsRequest) => this
    .request<TimeFilterPostcodeDistrictsResponse>('/time-filter/postcode-districts', 'post', { body });
  timeFilterPostcodeDistrictsBatch = async (requests: TimeFilterPostcodeDistrictsRequest[]) => this.batch(this.timeFilterPostcodeDistricts, requests);

  timeFilterPostcodeSectors = async (body: TimeFilterPostcodeSectorsRequest) => this
    .request<TimeFilterPostcodeSectorsResponse>('/time-filter/postcode-sectors', 'post', { body });
  timeFilterPostcodeSectorsBatch = async (requests: TimeFilterPostcodeSectorsRequest[]) => this.batch(this.timeFilterPostcodeSectors, requests);

  timeFilterPostcodes = async (body: TimeFilterPostcodesRequest) => this.request<TimeFilterPostcodesResponse>('/time-filter/postcodes', 'post', { body });
  timeFilterPostcodesBatch = async (requests: TimeFilterPostcodesRequest[]) => this.batch(this.timeFilterPostcodes, requests);

  async timeMap(body: TimeMapRequest): Promise<TimeMapResponse>
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format: T): Promise<TimeMapResponseType[T]>
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map', 'post', { body, config: { headers } });
  }
  async timeMapBatch(
    bodies: TimeMapRequest[],
  ): Promise<BatchResponse<Awaited<TimeMapResponse>>[]>
  async timeMapBatch<T extends keyof TimeMapResponseType>(
    bodies: TimeMapRequest[],
    format: T,
  ): Promise<BatchResponse<Awaited<TimeMapResponseType[T]>>[]>
  async timeMapBatch<T extends keyof TimeMapResponseType>(
    bodies: TimeMapRequest[],
    format?: T,
  ): Promise<BatchResponse<Awaited<TimeMapResponseType[T]>>[]> {
    return this.batch((body: TimeMapRequest) => this.timeMap(body, format as T), bodies);
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
  async timeMapFastBatch(
    bodies: TimeMapFastRequest[],
  ): Promise<BatchResponse<Awaited<TimeMapResponse>>[]>
  async timeMapFastBatch<T extends keyof TimeMapFastResponseType>(
    bodies: TimeMapFastRequest[],
    format: T,
  ): Promise<BatchResponse<Awaited<TimeMapFastResponseType[T]>>[]>
  async timeMapFastBatch<T extends keyof TimeMapFastResponseType>(
    bodies: TimeMapFastRequest[],
    format?: T,
  ): Promise<BatchResponse<Awaited<TimeMapFastResponseType[T]>>[]> {
    return this.batch((body: TimeMapFastRequest) => this.timeMapFast(body, format as T), bodies);
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
