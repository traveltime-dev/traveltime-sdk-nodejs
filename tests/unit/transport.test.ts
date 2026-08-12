import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import util from 'node:util';
import { Transport, TransportOptions } from '../../src/core/transport';
import {
  TravelTimeClient,
  TravelTimeProtoClient,
  TravelTimeError,
  TravelTimeNetworkError,
  TravelTimeValidationError,
} from '../../src';

const SENTINEL = 'SENTINEL-API-KEY-b8f2c611';

/** The transport reads the global `fetch` at call time, so tests stub it. */
type FakeFetch = (url: string, init: RequestInit) => Promise<Response>;
const stubFetch = (fn: FakeFetch) => vi.stubGlobal('fetch', fn);

function walkEnumerable(value: unknown, visit: (str: string) => void, seen = new Set<object>()) {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);
  Object.getOwnPropertyNames(value).forEach((key) => {
    walkEnumerable((value as Record<string, unknown>)[key], visit, seen);
  });
}

function expectNoSentinel(err: unknown) {
  expect(JSON.stringify(err)).not.toContain(SENTINEL);
  expect((err as Error).stack ?? '').not.toContain(SENTINEL);
  expect(util.inspect(err, { depth: null })).not.toContain(SENTINEL);
  walkEnumerable(err, (str) => expect(str).not.toContain(SENTINEL));
}

/** The transport always sends a plain header record, so recorded calls can be read as one. */
type RecordedCall = { url: string; init: RequestInit & { headers: Record<string, string> } };

/** A fake fetch that records calls and replays the given responses in order, repeating the last one. */
function recordingFetch(...responses: Array<() => Response | Promise<Response>>) {
  const calls: RecordedCall[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init: init as RecordedCall['init'] });
    return responses[Math.min(calls.length - 1, responses.length - 1)]();
  };
  return { calls, fn };
}

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => () => new Response(JSON.stringify(body), { status, headers });

/** A fetch that never settles until its signal aborts, like a hung connection. */
const hangingFetch = (url: string, init: RequestInit) => new Promise<Response>((resolve, reject) => {
  init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
});

const makeTransport = (fetchFn: FakeFetch, overrides: Partial<TransportOptions> = {}) => {
  stubFetch(fetchFn);
  return new Transport({
    baseURL: 'https://api.example.com/v4',
    auth: { scheme: 'api-key', applicationId: 'app-id', apiKey: 'test-key' },
    ...overrides,
  });
};

describe('transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('standard headers', () => {
    it('should send Content-Type, credential headers and a versioned User-Agent', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn).request('/time-map', { method: 'POST', body: '{}' });

      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://api.example.com/v4/time-map');
      expect(calls[0].init.headers['Content-Type']).toBe('application/json');
      expect(calls[0].init.headers['X-Application-Id']).toBe('app-id');
      expect(calls[0].init.headers['X-Api-Key']).toBe('test-key');
      expect(calls[0].init.headers['User-Agent']).toMatch(/^Travel Time Nodejs SDK \d+\.\d+\.\d+/);
      expect(calls[0].init.headers.Accept).toBe('application/json, text/plain, */*');
    });

    it('should not send Content-Type on a request without a body', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn).request('/geocoding/search', { method: 'GET', query: { query: 'London' } });

      expect(calls[0].init.headers['Content-Type']).toBeUndefined();
      expect(calls[0].init.headers.Accept).toBe('application/json, text/plain, */*');
    });

    it('should send a valid default Accept-Language that a caller can override', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}), jsonResponse(200, {}));
      const transport = makeTransport(fn);

      await transport.request('/geocoding/search', { method: 'GET', query: { query: 'Munich' } });
      expect(calls[0].init.headers['Accept-Language']).toBe('en');

      await transport.request('/geocoding/search', {
        method: 'GET',
        query: { query: 'Munich' },
        headers: { 'Accept-Language': 'de' },
      });
      expect(calls[1].init.headers['Accept-Language']).toBe('de');
    });

    it('should send the configured content type with a body', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn, { contentType: 'application/octet-stream' })
        .request('/uk/time-filter/fast/driving', { method: 'POST', body: new Uint8Array([1, 2]) });

      expect(calls[0].init.headers['Content-Type']).toBe('application/octet-stream');
    });

    it('should send HTTP Basic credentials for the basic auth scheme', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn, {
        auth: { scheme: 'basic', applicationId: 'app-id', apiKey: 'test-key' },
      }).request('/uk/time-filter/fast/driving', { method: 'POST', body: '{}' });

      expect(calls[0].init.headers.Authorization).toBe(`Basic ${Buffer.from('app-id:test-key').toString('base64')}`);
      expect(calls[0].init.headers['X-Api-Key']).toBeUndefined();
    });

    it('should let per-request headers override the defaults', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn).request('/time-map', { method: 'POST', body: '{}', headers: { Accept: 'application/geo+json' } });

      expect(calls[0].init.headers.Accept).toBe('application/geo+json');
      expect(calls[0].init.headers['X-Api-Key']).toBe('test-key');
    });

    it('should serialize query parameters, skipping undefined values', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn).request('/geocoding/search', {
        method: 'GET',
        query: { query: 'Parnidžio kopa', limit: 5, bounds: undefined },
      });

      expect(calls[0].url).toBe(`https://api.example.com/v4/geocoding/search?query=${encodeURIComponent('Parnidžio kopa').replace(/%20/g, '+')}&limit=5`);
    });
  });

  describe('base URL handling', () => {
    // a baseURL ending in a slash must keep working, or it silently 404s
    it.each([
      ['https://api.example.com/v4', '/time-map'],
      ['https://api.example.com/v4/', '/time-map'],
      ['https://api.example.com/v4///', '/time-map'],
      ['https://api.example.com/v4', 'time-map'],
      ['https://api.example.com/v4/', '//time-map'],
    ])('should join base %j and path %j with a single slash', async (baseURL, path) => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn, { baseURL }).request(path, { method: 'POST', body: '{}' });
      expect(calls[0].url).toBe('https://api.example.com/v4/time-map');
    });

    it('should accept an http base URL, e.g. a local mock server or proxy', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, {}));
      await makeTransport(fn, { baseURL: 'http://localhost:8080' }).request('/time-map', { method: 'POST', body: '{}' });
      expect(calls[0].url).toBe('http://localhost:8080/time-map');
    });
  });

  describe('non-2xx mapping', () => {
    it('should map a TravelTime-shaped JSON error body onto TravelTimeError', async () => {
      const { fn } = recordingFetch(jsonResponse(422, {
        http_status: 422, error_code: 10, description: 'Invalid request', documentation_link: 'https://docs.traveltime.com',
      }));

      const err = await makeTransport(fn).request('/time-map', { method: 'POST', body: '{}' }).catch((e) => e);
      expect(err).toBeInstanceOf(TravelTimeError);
      expect(err).not.toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(422);
      expect(err.errorCode).toBe(10);
      expect(err.isRetryable).toBe(false);
    });

    it('should map a non-TravelTime-shaped body onto TravelTimeNetworkError with the status', async () => {
      const { fn } = recordingFetch(() => new Response('<html>Bad Gateway</html>', { status: 502 }));

      const err = await makeTransport(fn).request('/time-map', { method: 'POST', body: '{}' }).catch((e) => e);
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(502);
      expect(err.isRetryable).toBe(true);
      expect(err.url).toBe('https://api.example.com/v4/time-map');
    });

    it('should map proto x-error headers onto TravelTimeError', async () => {
      const { fn } = recordingFetch(() => new Response(null, {
        status: 400,
        headers: { 'x-error-code': '4', 'x-error-message': 'Invalid country', 'x-error-details': 'country not supported' },
      }));

      const err = await makeTransport(fn, { errorFormat: 'proto' }).request('/uk/time-filter/fast/driving', { method: 'POST' }).catch((e) => e);
      expect(err).toBeInstanceOf(TravelTimeError);
      expect(err).not.toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(400);
      expect(err.errorCode).toBe(4);
      expect(err.description).toBe('Invalid country');
      expect(err.details).toBe('country not supported');
    });

    it('should map a proto response without x-error headers onto TravelTimeNetworkError', async () => {
      const { fn } = recordingFetch(() => new Response(null, { status: 401 }));

      const err = await makeTransport(fn, { errorFormat: 'proto' }).request('/uk/time-filter/fast/driving', { method: 'POST' }).catch((e) => e);
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(401);
      expect(err.isRetryable).toBe(false);
    });
  });

  describe('timeout', () => {
    it('should time out a hung request with a retryable timeout error', async () => {
      const err = await makeTransport(hangingFetch, { timeout: 30, retry: { enabled: false } })
        .request('/time-map', { method: 'POST', body: '{}' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect(err.code).toBe('ETIMEDOUT');
      expect(err.isRetryable).toBe(true);
    });

    it('should apply the timeout per attempt rather than once for the whole retry sequence', async () => {
      const { calls, fn } = recordingFetch(
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
        jsonResponse(200, { ok: true }),
      );

      const response = await makeTransport(fn, { timeout: 5_000, retry: { baseDelay: 10, maxDelay: 10 } })
        .request('/time-map', { method: 'POST', body: '{}' });

      expect(calls).toHaveLength(2);
      expect(response.status).toBe(200);
    });
  });

  describe('429 retry', () => {
    it('should retry a 429 and succeed', async () => {
      const { calls, fn } = recordingFetch(
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
        jsonResponse(200, { ok: true }),
      );

      const response = await makeTransport(fn, { retry: { baseDelay: 10, maxDelay: 10 } })
        .request('/time-map', { method: 'POST', body: '{}' });
      expect(calls).toHaveLength(2);
      expect(response.status).toBe(200);
    });

    it('should back off before retrying rather than firing straight away', async () => {
      const { calls, fn } = recordingFetch(
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
        jsonResponse(200, { ok: true }),
      );

      const started = Date.now();
      await makeTransport(fn, { retry: { maxRetries: 1, baseDelay: 300, maxDelay: 300 } })
        .request('/time-map', { method: 'POST', body: '{}' });

      expect(calls).toHaveLength(2);
      // the first backoff lands in the jitter band [150, 300)
      expect(Date.now() - started).toBeGreaterThanOrEqual(140);
    });

    it('should cap the backoff at maxDelay', async () => {
      const { calls, fn } = recordingFetch(
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
        jsonResponse(200, { ok: true }),
      );

      const started = Date.now();
      await makeTransport(fn, { retry: { baseDelay: 60_000, maxDelay: 5 } }).request('/time-map', { method: 'POST', body: '{}' });
      expect(calls).toHaveLength(2);
      expect(Date.now() - started).toBeLessThan(1000);
    });

    it('should exhaust retries and then throw the mapped 429', async () => {
      const { calls, fn } = recordingFetch(
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
      );

      const err = await makeTransport(fn, { retry: { maxRetries: 2, baseDelay: 1, maxDelay: 4 } })
        .request('/time-map', { method: 'POST', body: '{}' })
        .catch((e) => e);

      expect(calls).toHaveLength(3);
      expect(err).toBeInstanceOf(TravelTimeError);
      expect(err.status).toBe(429);
      expect(err.errorCode).toBe(5);
      expect(err.isRetryable).toBe(true);
    });

    it('should not retry when retry is disabled', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(429, { error_code: 5, description: 'Too many requests' }));

      const err = await makeTransport(fn, { retry: { enabled: false } }).request('/time-map', { method: 'POST', body: '{}' }).catch((e) => e);
      expect(calls).toHaveLength(1);
      expect(err.status).toBe(429);
    });

    it('should not retry non-429 failures', async () => {
      const { calls, fn } = recordingFetch(() => new Response('oops', { status: 503 }));

      await makeTransport(fn).request('/time-map', { method: 'POST', body: '{}' }).catch(() => undefined);
      expect(calls).toHaveLength(1);
    });

    // maxRetries: Infinity would never give up, and 0.5 silently meant one retry
    it.each([Infinity, 0.5, -1, NaN])('should reject maxRetries %p as invalid', (maxRetries) => {
      const { fn } = recordingFetch(jsonResponse(200, {}));
      expect(() => makeTransport(fn, { retry: { maxRetries } })).toThrow(TravelTimeValidationError);
    });

    it.each(['baseDelay', 'maxDelay'] as const)('should reject a non-positive %s', (key) => {
      const { fn } = recordingFetch(jsonResponse(200, {}));
      expect(() => makeTransport(fn, { retry: { [key]: 0 } })).toThrow(TravelTimeValidationError);
    });
  });

  describe('clients over the transport', () => {
    it('should parse a JSON API response', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(200, { map_info: [] }));
      stubFetch(fn);
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' });

      await expect(client.mapInfo()).resolves.toEqual({ map_info: [] });
      expect(calls[0].url).toBe('https://api.traveltimeapp.com/v4/map-info');
      expect(calls[0].init.method).toBe('GET');
    });

    it('should turn retries off via maxRetries: 0, the supported way with the limiter disabled', async () => {
      const { calls, fn } = recordingFetch(jsonResponse(429, { error_code: 5, description: 'Too many requests' }));
      stubFetch(fn);
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, { retry: { maxRetries: 0 } });

      const err = await client.mapInfo().catch((e) => e);
      expect(calls).toHaveLength(1);
      expect(err.status).toBe(429);
    });

    it('should keep the rate limiter 429 retry path working from the error status', async () => {
      const { calls, fn } = recordingFetch(
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
        jsonResponse(429, { error_code: 5, description: 'Too many requests' }),
        jsonResponse(200, { type: 'FeatureCollection', features: [] }),
      );
      stubFetch(fn);
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, retryCount: 3, timeBetweenRetries: 1 },
      });

      await expect(client.geocoding('London')).resolves.toEqual({ type: 'FeatureCollection', features: [] });
      // the transport's own retry is off while the rate limiter drives retries
      expect(calls).toHaveLength(3);
    });

    it('should build the proto request against the transport with Basic auth', async () => {
      const { calls, fn } = recordingFetch(() => new Response(new Uint8Array(0), { status: 200 }));
      stubFetch(fn);
      const client = new TravelTimeProtoClient({ apiKey: 'test-key', applicationId: 'app-id' });

      await expect(client.timeFilterFast({
        country: 'uk',
        departureLocation: { lat: 51.5, lng: -0.1 },
        destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
        transportation: 'driving',
        travelTime: 3600,
      })).resolves.toBeDefined();

      expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/time-filter/fast/driving');
      expect(calls[0].init.headers.Authorization).toBe(`Basic ${Buffer.from('app-id:test-key').toString('base64')}`);
      expect(calls[0].init.headers['Content-Type']).toBe('application/octet-stream');
      expect(calls[0].init.body).toBeInstanceOf(Uint8Array);
    });

    describe('credential leak regression through the whole transport', () => {
      it('should not leak the API key when fetch itself fails', async () => {
        const failure = new TypeError('fetch failed', {
          cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.traveltimeapp.com'), {
            code: 'ENOTFOUND',
            options: { headers: { 'X-Api-Key': SENTINEL, Authorization: `Basic ${SENTINEL}` } },
          }),
        });
        stubFetch(async () => { throw failure; });
        const client = new TravelTimeClient({ apiKey: SENTINEL, applicationId: 'app-id' });

        const err = await client.mapInfo().catch((e) => e);
        expect(err).toBeInstanceOf(TravelTimeNetworkError);
        expectNoSentinel(err);
      });

      it('should not leak the API key from a non-2xx JSON response with echoing headers', async () => {
        stubFetch(async () => new Response(`<html>${SENTINEL} is not authorized</html>`, {
          status: 500,
          headers: { 'x-echoed-api-key': SENTINEL },
        }));
        const client = new TravelTimeClient({ apiKey: SENTINEL, applicationId: 'app-id' });

        const err = await client.mapInfo().catch((e) => e);
        expect(err).toBeInstanceOf(TravelTimeNetworkError);
        expect(err.status).toBe(500);
        expectNoSentinel(err);
      });

      it('should not leak Basic credentials from a proto 401', async () => {
        stubFetch(async () => new Response(null, {
          status: 401,
          headers: { 'www-authenticate': 'Basic realm="proto"', 'x-echoed-authorization': `Basic ${SENTINEL}` },
        }));
        const client = new TravelTimeProtoClient({ apiKey: SENTINEL, applicationId: 'app-id' });

        const err = await client.timeFilterFast({
          country: 'uk',
          departureLocation: { lat: 51.5, lng: -0.1 },
          destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
          transportation: 'driving',
          travelTime: 3600,
        }).catch((e) => e);

        expect(err).toBeInstanceOf(TravelTimeNetworkError);
        expect(err.status).toBe(401);
        expectNoSentinel(err);
      });

      it('should not leak the API key from a timeout', async () => {
        stubFetch(hangingFetch);
        const client = new TravelTimeClient({ apiKey: SENTINEL, applicationId: 'app-id' }, { timeout: 20 });

        const err = await client.mapInfo().catch((e) => e);
        expect(err.code).toBe('ETIMEDOUT');
        expectNoSentinel(err);
      });
    });
  });
});
