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

function getHitAmountFromRequest(url: string, body: RequestPayload['body']): number | null {
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
      return (body.arrival_searches?.one_to_many?.length || 0) + (body.arrival_searches?.many_to_one?.length || 0);
    }
    case '/distance-map':
    case '/time-map':
    case '/h3':
    case '/geohash': {
      return (body.departure_searches?.length || 0) + (body.arrival_searches?.length || 0) + (body.unions?.length || 0) + (body.intersections?.length || 0);
    }
    default: return null;
  }
}

/** Client for the TravelTime JSON API. Failed calls reject with a `TravelTimeError`; batch methods report failures per request instead. */
export class TravelTimeClient {
  private transport: Transport;
  private rateLimiter: RateLimiter;

  /**
   * @param credentials Application id and key from the TravelTime Developer Portal.
   * @param parameters Optional settings, fixed for the lifetime of the client.
   */
  constructor(
    credentials: Credentials,
    parameters?: {
      /** API base URL. Default `https://api.traveltimeapp.com/v4`. */
      baseURL?: string,
      /** Client-side rate limiting. Off by default. */
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
    try {
      return await this.dispatch<Response>(url, method, payload);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  }

  private async dispatch<Response>(url: string, method: HttpMethod, payload?: RequestPayload): Promise<Response> {
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
    if (!this.rateLimiter.isEnabled()) return rq();
    // With the rate limiter enabled, the transport's own 429 retry is off and
    // retries are driven here instead, so a 429 can pause the whole queue.
    const hits = getHitAmountFromRequest(url, body || {});
    for (let retriesDone = 0; ; retriesDone += 1) {
      if (hits !== null) await this.rateLimiter.acquire(hits, retriesDone > 0);
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
    const settled = await Promise.allSettled(bodies.map((requestBody) => requestFn(requestBody)));
    return settled.map((result): BatchResponse<R> => (result.status === 'rejected'
      ? { type: 'error', error: TravelTimeError.from(result.reason) }
      : { type: 'success', body: result.value }));
  }

  /** Distance Map: shapes reachable within a travel distance, plus their unions and intersections. */
  async distanceMap(body: DistanceMapRequest): Promise<DistanceMapResponse>
  /**
   * Distance Map in the given response format.
   * @param format Response format, sent as the `Accept` header.
   */
  async distanceMap<T extends keyof DistanceMapResponseType>(body: DistanceMapRequest, format: T): Promise<DistanceMapResponseType[T]>
  async distanceMap<T extends keyof DistanceMapResponseType>(body: DistanceMapRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/distance-map', 'post', { body, config: { headers } });
  }

  /** Runs `distanceMap` for each body. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  async distanceMapBatch(
    bodies: DistanceMapRequest[],
  ): Promise<BatchResponse<Awaited<DistanceMapResponse>>[]>
  /**
   * Runs `distanceMap` for each body in the given response format. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails.
   * @param format Response format, sent as the `Accept` header.
   */
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
   * Geocoding search: matches an address, postcode or venue to coordinates.
   * @param query Text to geocode, e.g. `SW1A 0AA` or `Victoria street, London`.
   * @param req Optional `Accept-Language` and query parameters.
   */
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
  /** Runs `geocoding` for each query with the same settings. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  geocodingBatch = async (requests: string[], req?: GeocodingSearchRequest) => this.batch((coords) => this.geocoding(coords, req), requests);

  /**
   * Reverse geocoding: matches coordinates to an address.
   * @param acceptLanguage BCP47 language tag for the results. Falls back to English when unavailable.
   */
  async geocodingReverse(coords: Coords, acceptLanguage?: string) {
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.request<GeocodingResponse>('/geocoding/reverse', 'get', { config: { params: coords, headers } });
  }
  /** Runs `geocodingReverse` for each point. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  geocodingReverseBatch = async (requests: Coords[], acceptLanguage?: string) => this.batch((coords) => this.geocodingReverse(coords, acceptLanguage), requests);

  /** Map Info: the maps TravelTime covers and the features each supports. */
  mapInfo = async () => this.request<MapInfoResponse>('/map-info', 'get');

  /** Routes: route details, travel time, distance and fares between locations. */
  routes = async (body: RoutesRequest) => this.request<RoutesResponse>('/routes', 'post', { body });
  /** Runs `routes` for each request. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  routesBatch = async (requests: RoutesRequest[]) => this.batch(this.routes, requests);

  /** Supported Locations: which locations TravelTime covers and the map each falls in. */
  supportedLocations = async (body: SupportedLocationsRequest) => this.request<SupportedLocationsResponse>('/supported-locations', 'post', { body });

  /** Time Filter (Travel Time Matrix): which locations are reachable within a travel time, with their journey properties. */
  timeFilter = async (body: TimeFilterRequest) => this.request<TimeFilterResponse>('/time-filter', 'post', { body });
  /** Runs `timeFilter` for each request. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  timeFilterBatch = async (requests: TimeFilterRequest[]) => this.batch(this.timeFilter, requests);
  /**
   * Builds a many-to-many matrix between `coordsFrom` and `coordsTo` from batched `timeFilter` requests.
   * Requests that fail are reported in `errors` and leave `null` cells instead of rejecting.
   * Invalid input rejects with `TravelTimeValidationError`.
   */
  manyToManyMatrix = async (body: TimeFilterManyToManyMatrixRequest) => {
    try {
      const requests = timeFilterManyToManyMatrixToRequest(body);
      const responses = await this.timeFilterBatch(requests);
      return timeFilterManyToManyMatrixResponseMapper(responses, body.coordsFrom.length, body.coordsTo.length, body.properties || ['travel_time']);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  };

  /** Time Filter (Fast): a faster Time Filter for `weekday_morning`, with fewer parameters. */
  timeFilterFast = async (body: TimeFilterFastRequest) => this.request<TimeFilterFastResponse>('/time-filter/fast', 'post', { body });
  /** Runs `timeFilterFast` for each request. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  timeFilterFastBatch = async (requests: TimeFilterFastRequest[]) => this.batch(this.timeFilterFast, requests);
  /**
   * Builds a many-to-many matrix between `coordsFrom` and `coordsTo` from batched `timeFilterFast` requests.
   * Requests that fail are reported in `errors` and leave `null` cells instead of rejecting.
   * Invalid input rejects with `TravelTimeValidationError`.
   */
  manyToManyMatrixFast = async (body: TimeFilterFastManyToManyMatrixRequest) => {
    try {
      const requests = timeFilterFastManyToManyMatrixToRequest(body);
      const responses = await this.timeFilterFastBatch(requests);
      return timeFilterFastManyToManyMatrixResponseMapper(responses, body.coordsFrom.length, body.coordsTo.length, body.properties || ['travel_time']);
    } catch (error) {
      throw TravelTimeError.from(error);
    }
  };

  /** Time Filter (Postcode Districts): postcode districts reachable within a travel time, with coverage and travel time statistics. UK only. */
  timeFilterPostcodeDistricts = async (body: TimeFilterPostcodeDistrictsRequest) => this
    .request<TimeFilterPostcodeDistrictsResponse>('/time-filter/postcode-districts', 'post', { body });
  /** Runs `timeFilterPostcodeDistricts` for each request. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  timeFilterPostcodeDistrictsBatch = async (requests: TimeFilterPostcodeDistrictsRequest[]) => this.batch(this.timeFilterPostcodeDistricts, requests);

  /** Time Filter (Postcode Sectors): postcode sectors reachable within a travel time, with coverage and travel time statistics. UK only. */
  timeFilterPostcodeSectors = async (body: TimeFilterPostcodeSectorsRequest) => this
    .request<TimeFilterPostcodeSectorsResponse>('/time-filter/postcode-sectors', 'post', { body });
  /** Runs `timeFilterPostcodeSectors` for each request. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  timeFilterPostcodeSectorsBatch = async (requests: TimeFilterPostcodeSectorsRequest[]) => this.batch(this.timeFilterPostcodeSectors, requests);

  /** Time Filter (Postcodes): postcodes reachable within a travel time, with travel time and distance. UK only. */
  timeFilterPostcodes = async (body: TimeFilterPostcodesRequest) => this.request<TimeFilterPostcodesResponse>('/time-filter/postcodes', 'post', { body });
  /** Runs `timeFilterPostcodes` for each request. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  timeFilterPostcodesBatch = async (requests: TimeFilterPostcodesRequest[]) => this.batch(this.timeFilterPostcodes, requests);

  /** Time Map (isochrones): shapes reachable within a travel time, plus their unions and intersections. */
  async timeMap(body: TimeMapRequest): Promise<TimeMapResponse>
  /**
   * Time Map in the given response format.
   * @param format Response format, sent as the `Accept` header.
   */
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format: T): Promise<TimeMapResponseType[T]>
  async timeMap<T extends keyof TimeMapResponseType>(body: TimeMapRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map', 'post', { body, config: { headers } });
  }
  /** Runs `timeMap` for each body. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  async timeMapBatch(
    bodies: TimeMapRequest[],
  ): Promise<BatchResponse<Awaited<TimeMapResponse>>[]>
  /**
   * Runs `timeMap` for each body in the given response format. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails.
   * @param format Response format, sent as the `Accept` header.
   */
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

  /** Time Map (Fast): a faster Time Map for `weekday_morning`, with fewer parameters. */
  async timeMapFast(body: TimeMapFastRequest): Promise<TimeMapResponse>
  /**
   * Time Map (Fast) in the given response format.
   * @param format Response format, sent as the `Accept` header.
   */
  async timeMapFast<T extends keyof TimeMapFastResponseType>(body: TimeMapFastRequest, format: T): Promise<TimeMapFastResponseType[T]>
  async timeMapFast<T extends keyof TimeMapFastResponseType>(body: TimeMapFastRequest, format?: T) {
    const headers = format ? { Accept: format } : undefined;
    return this.request('/time-map/fast', 'post', { body, config: { headers } });
  }
  /** Runs `timeMapFast` for each body. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails. */
  async timeMapFastBatch(
    bodies: TimeMapFastRequest[],
  ): Promise<BatchResponse<Awaited<TimeMapResponse>>[]>
  /**
   * Runs `timeMapFast` for each body in the given response format. Requests run concurrently; resolves with one `BatchResponse` per request, in order, and does not reject when a request fails.
   * @param format Response format, sent as the `Accept` header.
   */
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

  /** H3: travel time statistics for the H3 cells reachable within a travel time. */
  h3 = async (body: H3Request) => this
    .request<H3Response>('/h3', 'post', { body });

  /** H3 (Fast): a faster H3 for `weekday_morning`, with fewer parameters. */
  h3Fast = async (body: H3FastRequest) => this
    .request<H3FastResponse>('/h3/fast', 'post', { body });

  /** Geohash: travel time statistics for the geohash cells reachable within a travel time. */
  geohash = async (body: GeohashRequest) => this
    .request<GeohashResponse>('/geohash', 'post', { body });

  /** Geohash (Fast): a faster Geohash for `weekday_morning`, with fewer parameters. */
  geohashFast = async (body: GeohashFastRequest) => this
    .request<GeohashFastResponse>('/geohash/fast', 'post', { body });
}
