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

function makeAxiosError(overrides: Record<string, any> = {}) {
  const config = {
    url: '/time-map',
    method: 'post',
    baseURL: 'https://api.traveltimeapp.com/v4',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': SENTINEL,
      Authorization: `Basic ${SENTINEL}`,
    },
    auth: { username: 'app-id', password: SENTINEL },
  };
  const request = { _header: `POST /time-map HTTP/1.1\r\nX-Api-Key: ${SENTINEL}\r\n` };
  const error: any = new Error('Request failed with status code 500');
  error.name = 'AxiosError';
  error.isAxiosError = true;
  error.code = 'ERR_BAD_RESPONSE';
  error.config = config;
  error.request = request;
  error.response = {
    status: 500,
    statusText: 'Internal Server Error',
    headers: {},
    config,
    request,
    data: '<html>Internal Server Error</html>',
  };
  Object.assign(error, overrides);
  return error;
}

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

const apiErrorResponse = (status: number, data: Record<string, unknown>) => ({
  response: { ...makeAxiosError().response, status, data },
});

const protoErrorResponse = (headers: Record<string, string>) => ({
  response: { ...makeAxiosError().response, status: 400, headers },
});

describe('error model', () => {
  describe('credential leak regression', () => {
    it('should not leak credentials from a non-TravelTime-shaped HTTP failure (JSON client mapping)', () => {
      const err = TravelTimeError.fromJsonError(makeAxiosError());
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a TravelTime-shaped API error', () => {
      const err = TravelTimeError.fromJsonError(makeAxiosError(apiErrorResponse(422, {
        http_status: 422,
        error_code: 10,
        description: 'Invalid request',
        documentation_link: 'https://docs.traveltime.com',
        additional_info: { travel_time: ['out of range'] },
      })));
      expect(err).toBeInstanceOf(TravelTimeError);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a proto error with x-error headers', () => {
      const err = TravelTimeError.fromProtoError(makeAxiosError(protoErrorResponse({
        'x-error-code': '4',
        'x-error-message': 'Invalid country',
        'x-error-details': 'country not supported',
      })));
      expect(err).toBeInstanceOf(TravelTimeError);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a proto failure without x-error headers', () => {
      const err = TravelTimeError.fromProtoError(makeAxiosError());
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
      expect(err.status).toBe(500);
      expectNoSentinel(err);
    });

    it('should not leak credentials from a transport failure with no response', () => {
      const err = TravelTimeError.fromJsonError(makeAxiosError({
        message: 'timeout of 1000ms exceeded',
        code: 'ECONNABORTED',
        response: undefined,
      }));
      expect(err).toBeInstanceOf(TravelTimeNetworkError);
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

    it('should strip the query string, fragment and any userinfo from the recorded url', () => {
      const relative = TravelTimeNetworkError.from(makeAxiosError({
        config: { url: '/time-map?key=value#frag' },
        response: undefined,
      }));
      expect(relative.url).toBe('/time-map');

      const absolute = TravelTimeNetworkError.from(makeAxiosError({
        config: { url: `https://app-id:${SENTINEL}@proxy.internal/api/v3/time-filter/fast/uk` },
        response: undefined,
      }));
      expect(absolute.url).toBe('https://proxy.internal/api/v3/time-filter/fast/uk');
      expectNoSentinel(absolute);
    });
  });

  describe('JSON error mapping', () => {
    it('should map API error body fields to camelCase fields', () => {
      const err = TravelTimeError.fromJsonError(makeAxiosError(apiErrorResponse(422, {
        http_status: 422,
        error_code: 10,
        description: 'Invalid request',
        documentation_link: 'https://docs.traveltime.com',
        additional_info: { travel_time: ['out of range'] },
      })));

      expect(err.status).toBe(422);
      expect(err.errorCode).toBe(10);
      expect(err.description).toBe('Invalid request');
      expect(err.message).toBe('Invalid request');
      expect(err.documentationLink).toBe('https://docs.traveltime.com');
      expect(err.additionalInfo).toEqual({ travel_time: ['out of range'] });
    });

    it('should map a body with error_code 0 as a TravelTime API error, not a network error', () => {
      const err = TravelTimeError.fromJsonError(makeAxiosError(apiErrorResponse(500, {
        http_status: 500, error_code: 0, description: 'Internal error', documentation_link: '', additional_info: {},
      })));

      expect(err).not.toBeInstanceOf(TravelTimeNetworkError);
      expect(err.errorCode).toBe(0);
      expect(err.status).toBe(500);
    });

    it('should return an already-mapped TravelTimeError as-is', () => {
      const original = new TravelTimeValidationError('bad input');
      expect(TravelTimeError.fromJsonError(original)).toBe(original);
      expect(TravelTimeError.fromProtoError(original)).toBe(original);
    });
  });

  describe('proto error mapping', () => {
    it('should map x-error headers onto error fields', () => {
      const err = TravelTimeError.fromProtoError(makeAxiosError(protoErrorResponse({
        'x-error-code': '4',
        'x-error-message': 'Invalid country',
        'x-error-details': 'country not supported',
      })));

      expect(err.status).toBe(400);
      expect(err.errorCode).toBe(4);
      expect(err.description).toBe('Invalid country');
      expect(err.details).toBe('country not supported');
    });

    it('should not produce NaN when x-error-code is absent or not numeric', () => {
      const missingCode = TravelTimeError.fromProtoError(makeAxiosError(protoErrorResponse({
        'x-error-message': 'Invalid country',
      })));
      expect(missingCode.errorCode).toBeUndefined();
      expect(missingCode.description).toBe('Invalid country');

      const badCode = TravelTimeError.fromProtoError(makeAxiosError(protoErrorResponse({
        'x-error-code': 'not-a-number',
        'x-error-message': 'Invalid country',
      })));
      expect(badCode.errorCode).toBeUndefined();
    });
  });

  it('should narrow caught errors with isTravelTimeError', () => {
    expect(TravelTimeError.isTravelTimeError(new TravelTimeValidationError('bad'))).toBe(true);
    expect(TravelTimeError.isTravelTimeError(TravelTimeNetworkError.from(new Error('boom')))).toBe(true);
    expect(TravelTimeError.isTravelTimeError(new Error('boom'))).toBe(false);
    // the pre-v8 guard matched this payload shape rather than a caught error
    expect(TravelTimeError.isTravelTimeError({ error_code: 10, description: 'payload, not an error' })).toBe(false);
    expect(TravelTimeError.isTravelTimeError(undefined)).toBe(false);
  });

  it('should compute isRetryable from the kind of failure', () => {
    const notFound = makeAxiosError({ response: { ...makeAxiosError().response, status: 404 } });
    const cases: Array<[string, TravelTimeError, boolean]> = [
      ['429', new TravelTimeError({ description: 'too many requests', status: 429 }), true],
      ['5xx', TravelTimeError.fromJsonError(makeAxiosError()), true],
      ['other 4xx', new TravelTimeError({ description: 'unprocessable', status: 422 }), false],
      ['4xx without a TravelTime body', TravelTimeNetworkError.from(notFound), false],
      ['transport failure with no status', TravelTimeError.fromJsonError(makeAxiosError({
        code: 'ENOTFOUND', response: undefined,
      })), true],
      ['validation failure', new TravelTimeValidationError('bad input'), false],
      // no transport failure was observed, so retrying cannot help
      ['non-axios failure', TravelTimeNetworkError.from(new TypeError('boom')), false],
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
      const client = new TravelTimeProtoClient({ apiKey: 'key', applicationId: 'app' });
      // A response arrived, so the failure is permanent — retrying cannot help
      (client as any).axiosInstance.post = async () => ({ data: Buffer.from([0xff, 0xff, 0xff, 0xff]) });

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
