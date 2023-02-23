import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
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
} from '../types';
import { TimeMapFastResponseType, TimeMapResponseType } from '../types/timeMapResponse';

type HttpMethod = 'get' | 'post'

type RequestPayload = {
  body?: any
  config?: AxiosRequestConfig
}

type RateLimitSettings = {
  enabled: boolean
  hitsPerMinute: number // HPM?
}

type Task<T = any> = () => Promise<T> | T;

const DEFAULT_BASE_URL = 'https://api.traveltimeapp.com/v4';

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

export class TravelTimeClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;
  private rateLimitSettings: RateLimitSettings;
  private requestQueue: Array<{task: Task, hits: number}>;
  private completedQueue: Set<string>;
  private isThrottleActive: boolean;
  private isRequestInProgress: boolean;

  constructor(
    credentials: { apiKey: string, applicationId: string },
    parameters?: { baseURL?: string, rateLimitSettings?: Partial<RateLimitSettings> },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.requestQueue = [];
    this.completedQueue = new Set();
    this.isThrottleActive = false;
    this.isRequestInProgress = false;
    this.rateLimitSettings = {
      enabled: false,
      hitsPerMinute: 60,
      ...parameters?.rateLimitSettings,
    };
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

  private disableThrottle(hits: number) {
    if (!this.isThrottleActive) return;
    setTimeout(() => {
      this.isThrottleActive = false;
      if (this.requestQueue.length > 0) this.execute();
    }, ((60 * 1000) / this.rateLimitSettings.hitsPerMinute) * hits);
  }

  private taskCleanUp(ids: string[]) {
    this.isRequestInProgress = false;

    if (this.requestQueue.length > 0) this.execute();

    setTimeout(() => {
      ids.forEach((id) => this.completedQueue.delete(id));
      this.execute();
    }, 1000 * 60);
  }

  private async execute() {
    if (this.isRequestInProgress || this.isThrottleActive) return;
    const request = this.requestQueue.shift();
    if (!request) {
      return;
    }
    if (this.completedQueue.size + request.hits < this.rateLimitSettings.hitsPerMinute) {
      this.isThrottleActive = true;
      this.isRequestInProgress = true;
      const uuids = [...Array(request.hits).keys()].map(() => crypto.randomUUID());
      uuids.forEach((id) => this.completedQueue.add(id));
      this.disableThrottle(uuids.length);
      await request.task();
      this.taskCleanUp(uuids);
    } else {
      this.requestQueue.unshift(request);
    }
  }

  private addAndExecute(request: Task, hits: number) {
    this.requestQueue.push({ task: request, hits });
    this.execute();
  }

  private async request<Response>(url: string, method: HttpMethod, payload?: RequestPayload): Promise<Response> {
    const { body, config } = payload || {};
    const rq = () => (method === 'get' ? this.axiosInstance[method]<Response>(url, config) : this.axiosInstance[method]<Response>(url, body, config));
    try {
      const promise = this.rateLimitSettings.enabled ? new Promise<Awaited<ReturnType<typeof rq>>>((resolve) => {
        this.addAndExecute(() => resolve(rq()), getHitAmountFromRequest(url, body || {}));
      }) : rq();
      const { data } = await promise;
      return data;
    } catch (error) {
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
  async timeMapFast<T extends keyof TimeMapFastResponseType>(body: TimeMapFastRequest, format: T): Promise<TimeMapFastResponseType[T]>
  async timeMapFast<T extends keyof TimeMapFastResponseType>(body: TimeMapFastRequest, format?: T) {
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

  setRateLimitSettings = (settings: Partial<RateLimitSettings>) => {
    this.rateLimitSettings = {
      ...this.rateLimitSettings,
      ...settings,
    };
  };
}
