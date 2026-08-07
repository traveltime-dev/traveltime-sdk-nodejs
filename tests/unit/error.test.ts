import { describe, it, expect } from 'vitest';
import util from 'node:util';
import {
  TravelTimeClient,
  TravelTimeProtoClient,
  TravelTimeError,
  TravelTimeNetworkError,
  TravelTimeValidationError,
} from '../../src';

const SENTINEL = 'SENTINEL-API-KEY-b8f2c611';
const REQUEST_URL = 'https://api.traveltimeapp.com/v4/time-map';

/**
 * A native fetch transport failure: a terse TypeError whose useful detail is
 * on `cause`. The cause carries the sentinel on properties a sloppy mapping
 * might copy wholesale (undici attaches connect options to some causes).
 */
function makeFetchFailure(overrides: { message?: string; code?: string; causeMessage?: string } = {}) {
  const cause = Object.assign(new Error(overrides.causeMessage ?? 'getaddrinfo ENOTFOUND api.traveltimeapp.com'), {
    code: overrides.code ?? 'ENOTFOUND',
    syscall: 'getaddrinfo',
    hostname: 'api.traveltimeapp.com',
    localAddress: SENTINEL,
    options: {
      headers: {
        'X-Api-Key': SENTINEL,
        Authorization: `Basic ${SENTINEL}`,
      },
    },
  });
  return new TypeError(overrides.message ?? 'fetch failed', { cause });
}

/** Response headers as a server (or proxy) could echo them, sentinel included. */
const makeResponseHeaders = (extra: Record<string, string> = {}) => new Headers({
  'x-echoed-api-key': SENTINEL,
  via: `proxy auth=${SENTINEL}`,
  ...extra,
});

function walkEnumerable(value: unknown, visit: (str: string) => void, seen = new Set<object>()) {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);
  // getOwnPropertyNames also picks up non-enumerable props such as message/stack
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

describe('error model', () => {
  describe('credential leak regression', () => {
    it('should not leak credentials from a non-TravelTime-shaped HTTP failure (JSON response mapping)', () => {
      // fetch resolved with a 500 whose body is not a TravelTime payload
      const err = TravelTimeError.fromJsonResponse(500, '<html>Internal Server Error</html>', REQUEST_URL);
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(500);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a TravelTime-shaped API error', () => {
      const err = TravelTimeError.fromJsonResponse(422, {
        http_status: 422,
        error_code: 10,
        description: 'Invalid request',
        documentation_link: 'https://docs.traveltime.com',
        additional_info: { travel_time: ['out of range'] },
      }, REQUEST_URL);
      expect(err).toBeInstanceOf(TravelTimeError);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a proto error with x-error headers', () => {
      const err = TravelTimeError.fromProtoResponse(400, makeResponseHeaders({
        'x-error-code': '4',
        'x-error-message': 'Invalid country',
        'x-error-details': 'country not supported',
      }), REQUEST_URL);
      expect(err).toBeInstanceOf(TravelTimeError);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a proto failure without x-error headers', () => {
      const err = TravelTimeError.fromProtoResponse(500, makeResponseHeaders(), REQUEST_URL);
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(500);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a transport failure with no response', () => {
      const err = TravelTimeError.from(makeFetchFailure());
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect((err as TravelTimeNetworkError).code).toBe('ENOTFOUND');
      expectNoSentinel(err);
    });

    it('should not echo a partially supplied key from credentials validation', () => {
      try {
        // eslint-disable-next-line no-new
        new TravelTimeClient({ apiKey: SENTINEL, applicationId: '' });
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TravelTimeValidationError);
        expectNoSentinel(error);
      }
    });
  });

  describe('JSON error mapping', () => {
    it('should map API error body fields to camelCase fields', () => {
      const err = TravelTimeError.fromJsonResponse(422, {
        http_status: 422,
        error_code: 10,
        description: 'Invalid request',
        documentation_link: 'https://docs.traveltime.com',
        additional_info: { travel_time: ['out of range'] },
      });

      expect(err.status).toBe(422);
      expect(err.errorCode).toBe(10);
      expect(err.description).toBe('Invalid request');
      expect(err.message).toBe('Invalid request');
      expect(err.documentationLink).toBe('https://docs.traveltime.com');
      expect(err.additionalInfo).toEqual({ travel_time: ['out of range'] });
    });

    it('should map a body with error_code 0 as a TravelTime API error, not a network error', () => {
      const err = TravelTimeError.fromJsonResponse(500, {
        http_status: 500, error_code: 0, description: 'Internal error', documentation_link: '', additional_info: {},
      });

      expect(err).not.toBeInstanceOf(TravelTimeNetworkError);
      expect(err.errorCode).toBe(0);
      expect(err.status).toBe(500);
    });

    it('should return an already-mapped TravelTimeError as-is', () => {
      const original = new TravelTimeValidationError('bad input');
      expect(TravelTimeError.from(original)).toBe(original);
    });
  });

  describe('proto error mapping', () => {
    it('should map x-error headers onto error fields', () => {
      const err = TravelTimeError.fromProtoResponse(400, new Headers({
        'x-error-code': '4',
        'x-error-message': 'Invalid country',
        'x-error-details': 'country not supported',
      }));

      expect(err.status).toBe(400);
      expect(err.errorCode).toBe(4);
      expect(err.description).toBe('Invalid country');
      expect(err.details).toBe('country not supported');
    });

    it('should not produce NaN when x-error-code is absent or not numeric', () => {
      const missingCode = TravelTimeError.fromProtoResponse(400, new Headers({
        'x-error-message': 'Invalid country',
      }));
      expect(missingCode.errorCode).toBeUndefined();
      expect(missingCode.description).toBe('Invalid country');

      const badCode = TravelTimeError.fromProtoResponse(400, new Headers({
        'x-error-code': 'not-a-number',
        'x-error-message': 'Invalid country',
      }));
      expect(badCode.errorCode).toBeUndefined();
    });
  });

  describe('thrown failure mapping', () => {
    it('should surface the useful detail from a fetch failure cause', () => {
      const err = TravelTimeNetworkError.from(makeFetchFailure());
      expect(err.code).toBe('ENOTFOUND');
      expect(err.description).toBe('getaddrinfo ENOTFOUND api.traveltimeapp.com');
    });

    it('should unwrap an AggregateError cause to find the code', () => {
      const cause = new AggregateError([
        Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), { code: 'ECONNREFUSED' }),
        Object.assign(new Error('connect ECONNREFUSED ::1:443'), { code: 'ECONNREFUSED' }),
      ], '');
      const err = TravelTimeNetworkError.from(new TypeError('fetch failed', { cause }));
      expect(err.code).toBe('ECONNREFUSED');
      expect(err.isRetryable).toBe(true);
    });

    it('should map a timeout DOMException as a retryable timeout', () => {
      const err = TravelTimeNetworkError.from(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
      expect(err.code).toBe('ETIMEDOUT');
      expect(err.isRetryable).toBe(true);
    });

    it('should map an abort DOMException as a non-retryable abort, distinct from a timeout', () => {
      const err = TravelTimeNetworkError.from(new DOMException('This operation was aborted', 'AbortError'));
      expect(err.code).toBe('ABORT_ERR');
      expect(err.code).not.toBe('ETIMEDOUT');
      expect(err.isRetryable).toBe(false);
    });
  });

  it('should narrow caught errors with isTravelTimeError', () => {
    expect(TravelTimeError.isTravelTimeError(new TravelTimeValidationError('bad'))).toBe(true);
    expect(TravelTimeError.isTravelTimeError(TravelTimeNetworkError.from(new Error('boom')))).toBe(true);
    expect(TravelTimeError.isTravelTimeError(new Error('boom'))).toBe(false);
    // a raw API payload is not a caught error, so it must not narrow
    expect(TravelTimeError.isTravelTimeError({ error_code: 10, description: 'payload, not an error' })).toBe(false);
    expect(TravelTimeError.isTravelTimeError(undefined)).toBe(false);
  });

  it('should compute isRetryable from the kind of failure', () => {
    const cases: Array<[string, TravelTimeError, boolean]> = [
      ['429', new TravelTimeError({ description: 'too many requests', status: 429 }), true],
      ['5xx', TravelTimeError.fromJsonResponse(500, '<html>Internal Server Error</html>'), true],
      ['other 4xx', new TravelTimeError({ description: 'unprocessable', status: 422 }), false],
      ['4xx without a TravelTime body', TravelTimeError.fromJsonResponse(404, undefined), false],
      ['transport failure with no status', TravelTimeError.from(makeFetchFailure()), true],
      ['validation failure', new TravelTimeValidationError('bad input'), false],
      // no transport failure was observed, so retrying cannot help
      ['non-fetch failure', TravelTimeNetworkError.from(new TypeError('boom')), false],
    ];

    cases.forEach(([label, error, expected]) => {
      expect(error.isRetryable, label).toBe(expected);
    });
  });

  describe('client-side validation', () => {
    it('should reject proto requests with an unsupported transportation mode', async () => {
      const client = new TravelTimeProtoClient({ apiKey: 'key', applicationId: 'app' });
      await expect(client.timeFilterFast({
        country: 'uk',
        departureLocation: { lat: 51.5, lng: -0.1 },
        destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
        transportation: 'rocket' as any,
        travelTime: 3600,
      })).rejects.toBeInstanceOf(TravelTimeValidationError);
    });

    it('should reject geohash proto requests with both departure and arrival locations', async () => {
      const client = new TravelTimeProtoClient({ apiKey: 'key', applicationId: 'app' });
      await expect(client.geohashFast({
        country: 'uk',
        departureLocation: { lat: 51.5, lng: -0.1 },
        arrivalLocation: { lat: 51.6, lng: -0.2 },
        transportation: 'driving',
        travelTime: 3600,
        resolution: 6,
      })).rejects.toBeInstanceOf(TravelTimeValidationError);
    });

    it('should reject a matrix request exceeding the max searches limit', async () => {
      const client = new TravelTimeClient({ apiKey: 'key', applicationId: 'app' });
      const body = {
        coordsFrom: [{ lat: 51.5, lng: -0.1 }],
        coordsTo: [{ lat: 51.6, lng: -0.2 }],
        maxSearchesPerRequest: 100_001,
        transportation: { type: 'driving' as const },
      };

      await expect(client.manyToManyMatrix(body as any)).rejects.toBeInstanceOf(TravelTimeValidationError);
      await expect(client.manyToManyMatrixFast(body as any)).rejects.toBeInstanceOf(TravelTimeValidationError);
    });

    it('should reject malformed matrix input with a validation error naming the field', async () => {
      const client = new TravelTimeClient({ apiKey: 'key', applicationId: 'app' });
      const coords = [{ lat: 51.6, lng: -0.2 }];

      await expect(client.manyToManyMatrix({ coordsTo: coords } as any))
        .rejects.toThrow('coordsFrom must be an array of coordinates');
      await expect(client.manyToManyMatrixFast({ coordsTo: coords } as any))
        .rejects.toThrow('coordsFrom must be an array of coordinates');
      await expect(client.manyToManyMatrix({ coordsFrom: coords } as any))
        .rejects.toThrow('coordsTo must be an array of coordinates');
      await expect(client.manyToManyMatrix(undefined as any))
        .rejects.toThrow('Request body must be an object');

      await expect(client.manyToManyMatrix({ coordsTo: coords } as any))
        .rejects.toBeInstanceOf(TravelTimeValidationError);
    });

    it('should still accept empty coordinate arrays', async () => {
      const client = new TravelTimeClient({ apiKey: 'key', applicationId: 'app' });
      // zero searches means zero requests; this reached the API as an empty
      // matrix before validation was added and must keep doing so
      await expect(client.manyToManyMatrix({ coordsFrom: [], coordsTo: [] } as any)).resolves.toBeDefined();
    });

    it('should map errors thrown while building the request, not just while sending it', async () => {
      const client = new TravelTimeProtoClient({ apiKey: 'key', applicationId: 'app' });
      // departureLocation is required; a plain-JS caller can omit it and the
      // request builder throws before any request is made
      await expect(client.timeFilterFast({
        country: 'uk',
        destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
        transportation: 'driving',
        travelTime: 3600,
      } as any)).rejects.toBeInstanceOf(TravelTimeError);
    });

    it('should not mark an undecodable proto response as retryable', async () => {
      // A response arrived, so the failure is permanent — retrying cannot help
      const client = new TravelTimeProtoClient({ apiKey: 'key', applicationId: 'app' }, {
        fetch: async () => new Response(Buffer.from([0xff, 0xff, 0xff, 0xff]), { status: 200 }),
      });

      try {
        await client.timeFilterFast({
          country: 'uk',
          departureLocation: { lat: 51.5, lng: -0.1 },
          destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
          transportation: 'driving',
          travelTime: 3600,
        });
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TravelTimeError);
        expect((error as TravelTimeError).isRetryable).toBe(false);
        expect(error).not.toBeInstanceOf(TravelTimeNetworkError);
      }
    });
  });
});
