import { TravelTimeError, TravelTimeValidationError } from '../error';
import { Transport, TransportRetryOptions } from '../core/transport';
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
  BatchResponse,
  GenericFunction,
  DistanceMapRequest,
  DistanceMapResponseType,
  DistanceMapResponse,
} from '../types';
import { TimeMapFastResponseType, TimeMapResponseType } from '../types/timeMapResponse';
import { RateLimiter, RateLimitSettings } from './rateLimiter';
import { TimeFilterFastManyToManyMatrixRequest, TimeFilterManyToManyMatrixRequest } from '../types/timeFilterMatrix';
import {
  timeFilterFastManyToManyMatrixResponseMapper, timeFilterFastManyToManyMatrixToRequest, timeFilterManyToManyMatrixResponseMapper, timeFilterManyToManyMatrixToRequest,
} from './matrixMapper';
import { H3Request, H3Response } from '../types/h3';
import { H3FastRequest, H3FastResponse } from '../types/h3Fast';
import { GeohashRequest, GeohashResponse } from '../types/geohash';
import { GeohashFastRequest, GeohashFastResponse } from '../types/geohashFast';

type HttpMethod = 'get' | 'post'

type RequestConfig = {
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

type RequestPayload = {
  body?: any
  config?: RequestConfig
}

const DEFAULT_BASE_URL = 'https://api.traveltimeapp.com/v4';

/**
 * Decodes a response body: JSON when it parses, otherwise the raw text
 * (e.g. the KML response formats).
 */
function parseResponseBody(body: Buffer): unknown {
  const text = body.toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

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
    case '/time-filter/fast':
    case '/h3/fast':
    case '/geohash/fast': {
      return (body.arrival_searches.one_to_many?.length || 0) + (body.arrival_searches.many_to_one?.length || 0);
    }
    case '/distance-map':
    case '/time-map':
    case '/h3':
    case '/geohash': {
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
    '/h3',
    '/h3/fast',
    '/geohash',
    '/geohash/fast',
  ].includes(url);
}

export class TravelTimeClient {
  private transport: Transport;
  private rateLimiter: RateLimiter;

  constructor(
    credentials: Credentials,
    parameters?: {
      baseURL?: string,
      rateLimitSettings?: Partial<RateLimitSettings>,
      /** Request timeout in milliseconds. Default `120000`. */
      timeout?: number,
      /** HTTP 429 retry behaviour. On by default, unless the rate limiter is enabled — its own retry logic applies then. */
      retry?: TransportRetryOptions,
    },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new TravelTimeValidationError('Credentials must be valid');
    this.rateLimiter = new RateLimiter(parameters?.rateLimitSettings);
    this.transport = new Transport({
      baseURL: parameters?.baseURL ?? DEFAULT_BASE_URL,
      auth: { scheme: 'api-key', applicationId: credentials.applicationId, apiKey: credentials.apiKey },
      timeout: parameters?.timeout,
      // `enabled` comes last so a caller-supplied object cannot switch the
      // transport retry back on while the rate limiter drives 429 retries
      retry: { ...parameters?.retry, enabled: !this.rateLimiter.isEnabled() },
    });
  }

  private async request<Response>(url: string, method: HttpMethod, payload?: RequestPayload): Promise<Response> {
    const { body, config } = payload || {};
    const rq = async (): Promise<Response> => {
      const response = await this.transport.request(url, {
        method: method === 'get' ? 'GET' : 'POST',
        query: config?.params,
        headers: config?.headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return parseResponseBody(response.body) as Response;
    };
    if (!this.rateLimiter.isEnabled()) {
      try {
        return await rq();
      } catch (error) {
        throw TravelTimeError.from(error);
      }
    }
    // With the rate limiter enabled, the transport's own 429 retry is off and
    // retries are driven here instead, so a 429 can pause the whole queue.
    const isQuotaLimited = endpointChecksHPM(url);
    const hits = isQuotaLimited ? getHitAmountFromRequest(url, body || {}) : 0;
    for (let retriesDone = 0; ; retriesDone += 1) {
      if (isQuotaLimited) await this.rateLimiter.acquire(hits, retriesDone > 0);
      try {
        return await rq();
      } catch (error) {
        const mapped = TravelTimeError.from(error);
        if (mapped.status !== 429 || retriesDone >= this.rateLimiter.getRetryCount()) throw mapped;
        await this.rateLimiter.backOff();
      }
    }
  }

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

  supportedLocations = async (body: SupportedLocationsRequest) => this.request<SupportedLocationsResponse>('/supported-locations', 'post', { body });

  timeFilter = async (body: TimeFilterRequest) => this.request<TimeFilterResponse>('/time-filter', 'post', { body });
  timeFilterBatch = async (requests: TimeFilterRequest[]) => this.batch(this.timeFilter, requests);
  manyToManyMatrix = async (body: TimeFilterManyToManyMatrixRequest) => {
    try {
      const requests = timeFilterManyToManyMatrixToRequest(body);
      const responses = await this.timeFilterBatch(requests);
      return timeFilterManyToManyMatrixResponseMapper(responses, body.coordsFrom.length, body.coordsTo.length, body.properties || ['travel_time']);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  };

  timeFilterFast = async (body: TimeFilterFastRequest) => this.request<TimeFilterFastResponse>('/time-filter/fast', 'post', { body });
  timeFilterFastBatch = async (requests: TimeFilterFastRequest[]) => this.batch(this.timeFilterFast, requests);
  manyToManyMatrixFast = async (body: TimeFilterFastManyToManyMatrixRequest) => {
    try {
      const requests = timeFilterFastManyToManyMatrixToRequest(body);
      const responses = await this.timeFilterFastBatch(requests);
      return timeFilterFastManyToManyMatrixResponseMapper(responses, body.coordsFrom.length, body.coordsTo.length, body.properties || ['travel_time']);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  };

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

  h3 = async (body: H3Request) => this
    .request<H3Response>('/h3', 'post', { body });

  h3Fast = async (body: H3FastRequest) => this
    .request<H3FastResponse>('/h3/fast', 'post', { body });

  geohash = async (body: GeohashRequest) => this
    .request<GeohashResponse>('/geohash', 'post', { body });

  geohashFast = async (body: GeohashFastRequest) => this
    .request<GeohashFastResponse>('/geohash/fast', 'post', { body });
}
