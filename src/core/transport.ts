import { setTimeout as sleep } from 'node:timers/promises';
import { TravelTimeError, TravelTimeNetworkError, TravelTimeValidationError } from '../error';

const sdkVersion = require('../../package.json').version;

const DEFAULT_TIMEOUT = 120_000;
const DEFAULT_RETRY_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY = 1_000;
const DEFAULT_RETRY_MAX_DELAY = 60_000;

export interface TransportRetryOptions {
  /** Whether requests rejected with HTTP 429 are retried. Default `true`. */
  enabled?: boolean;
  /** Maximum number of retries after the initial attempt. Default `3`. */
  maxRetries?: number;
  /** First backoff delay in milliseconds, doubled on every retry. Default `1000`. */
  baseDelay?: number;
  /** Upper bound in milliseconds for any single retry delay. Default `60000`. */
  maxDelay?: number;
}

export type TransportAuth = {
  /** `api-key` sends `X-Application-Id`/`X-Api-Key` headers, `basic` sends an `Authorization: Basic` header. */
  scheme: 'api-key' | 'basic';
  applicationId: string;
  apiKey: string;
};

export interface TransportOptions {
  /** Absolute base URL. */
  baseURL: string;
  auth: TransportAuth;
  /** Default headers, merged over the transport's standard headers. */
  headers?: Record<string, string>;
  /** How non-2xx responses carry API errors: a JSON body or `x-error-*` headers. Default `'json'`. */
  errorFormat?: 'json' | 'proto';
  /** Per-attempt timeout in milliseconds. Default `120000`. */
  timeout?: number;
  retry?: TransportRetryOptions;
}

export interface TransportRequestOptions {
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: string | Uint8Array;
}

export interface TransportResponse {
  status: number;
  body: Buffer;
}

type AttemptOutcome =
  | { ok: true; response: TransportResponse }
  | { ok: false; error: TravelTimeError };

/**
 * Joins a base URL and a request path with exactly one slash, so a base URL
 * that ends in a slash keeps working: `https://api.traveltimeapp.com/v4/`
 * would otherwise produce `/v4//map-info`, which the API answers with a 404.
 */
function joinUrl(baseURL: string, path: string): string {
  return `${baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function buildHeaders(options: TransportOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': `Travel Time Nodejs SDK ${sdkVersion}`,
    ...options.headers,
  };
  const { auth } = options;
  if (auth.scheme === 'basic') {
    headers.Authorization = `Basic ${Buffer.from(`${auth.applicationId}:${auth.apiKey}`).toString('base64')}`;
  } else {
    headers['X-Application-Id'] = auth.applicationId;
    headers['X-Api-Key'] = auth.apiKey;
  }
  return headers;
}

function tryParseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Shared HTTP layer for both clients, built on the native `fetch`.
 *
 * - applies a per-attempt timeout
 * - retries HTTP 429 with exponential backoff and jitter
 * - maps every failure to a sanitized `TravelTimeError` subclass; raw
 *   request/response objects (which carry credential headers) never escape
 */
export class Transport {
  private baseURL: string;
  private headers: Record<string, string>;
  private errorFormat: 'json' | 'proto';
  private timeout: number;
  private retry: Required<TransportRetryOptions>;

  constructor(options: TransportOptions) {
    this.baseURL = options.baseURL;
    this.headers = buildHeaders(options);
    this.errorFormat = options.errorFormat ?? 'json';
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retry = {
      enabled: options.retry?.enabled ?? true,
      maxRetries: options.retry?.maxRetries ?? DEFAULT_RETRY_MAX_RETRIES,
      baseDelay: options.retry?.baseDelay ?? DEFAULT_RETRY_BASE_DELAY,
      maxDelay: options.retry?.maxDelay ?? DEFAULT_RETRY_MAX_DELAY,
    };
    if (!Number.isFinite(this.timeout) || this.timeout <= 0) {
      throw new TravelTimeValidationError('timeout must be a positive number of milliseconds');
    }
  }

  async request(path: string, options: TransportRequestOptions): Promise<TransportResponse> {
    const url = this.buildUrl(path, options.query);
    const maxRetries = this.retry.enabled ? this.retry.maxRetries : 0;
    for (let attempt = 0; ; attempt += 1) {
      const outcome = await this.attempt(url, options);
      if (outcome.ok) return outcome.response;
      const shouldRetry = outcome.error.status === 429 && attempt < maxRetries;
      if (!shouldRetry) throw outcome.error;
      await this.waitBeforeRetry(this.retryDelay(attempt));
    }
  }

  private buildUrl(path: string, query?: TransportRequestOptions['query']): string {
    const url = joinUrl(this.baseURL, path);
    if (!query) return url;
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, String(value));
    });
    const qs = params.toString();
    return qs === '' ? url : `${url}?${qs}`;
  }

  private async attempt(url: string, options: TransportRequestOptions): Promise<AttemptOutcome> {
    const timeoutSignal = AbortSignal.timeout(this.timeout);
    try {
      // Referenced at call time, not captured, so tests can stub the global.
      const response = await fetch(url, {
        method: options.method,
        headers: { ...this.headers, ...options.headers },
        body: options.body,
        signal: timeoutSignal,
      });
      const body = Buffer.from(await response.arrayBuffer());
      if (response.status >= 200 && response.status < 300) {
        return { ok: true, response: { status: response.status, body } };
      }
      return { ok: false, error: this.errorFromResponse(response, body, url) };
    } catch (error) {
      return { ok: false, error: this.errorFromThrown(error, timeoutSignal, url) };
    }
  }

  private errorFromResponse(response: Response, body: Buffer, url: string): TravelTimeError {
    if (this.errorFormat === 'proto') {
      return TravelTimeError.fromProtoResponse(response.status, response.headers, url);
    }
    return TravelTimeError.fromJsonResponse(response.status, tryParseJson(body), url);
  }

  /**
   * Maps a failure thrown by `fetch` or by the body read. The guard for an
   * already-mapped error must stay first: anything thrown from inside the
   * request that happened to land after the timeout fired would otherwise be
   * relabelled as a timeout.
   */
  private errorFromThrown(error: unknown, timeoutSignal: AbortSignal, url: string): TravelTimeError {
    if (error instanceof TravelTimeError) return error;
    if (timeoutSignal.aborted) {
      return new TravelTimeNetworkError({
        description: `Request timed out after ${this.timeout} ms`, code: 'ETIMEDOUT', url, isRetryable: true,
      });
    }
    return TravelTimeNetworkError.from(error, url);
  }

  private retryDelay(attempt: number): number {
    const { baseDelay, maxDelay } = this.retry;
    const backoff = Math.min(baseDelay * 2 ** attempt, maxDelay);
    // Equal jitter: uniform over [backoff/2, backoff), so concurrent retries spread out
    return backoff / 2 + Math.random() * (backoff / 2);
  }

  private async waitBeforeRetry(delay: number): Promise<void> {
    await sleep(delay);
  }
}
