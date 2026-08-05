/* eslint-disable max-classes-per-file, no-use-before-define */
import axios from 'axios';

/**
 * Shape of the TravelTime API JSON error response body.
 * https://docs.traveltime.com/api/reference/error-response
 */
export interface TravelTimeApiErrorPayload {
  http_status?: number;
  error_code: number;
  description: string;
  documentation_link?: string;
  additional_info?: Record<string, any>;
}

export interface TravelTimeErrorParams {
  description: string;
  status?: number;
  errorCode?: number;
  documentationLink?: string;
  additionalInfo?: Record<string, any>;
  details?: string;
  isRetryable?: boolean;
}

function isRetryableStatus(status: number | undefined): boolean {
  return status !== undefined && (status === 429 || status >= 500);
}

function isApiErrorPayload(payload: any): payload is TravelTimeApiErrorPayload {
  return typeof payload === 'object'
    && payload !== null
    && typeof payload.error_code === 'number'
    && typeof payload.description === 'string';
}

/**
 * Reduces a request URL to origin + path. Strips the query string, the
 * fragment, and any userinfo a caller may have embedded in a custom base URL.
 */
function sanitizeUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Relative path, as used by the JSON client
    return url.split(/[?#]/)[0];
  }
}

function parseNumericHeader(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Base error thrown by the SDK. Errors returned by the TravelTime API
 * are thrown as instances of this class; local validation failures and
 * transport failures are thrown as its subclasses.
 *
 * Instances never hold request or response objects, headers, or
 * credentials — they are safe to log and serialize.
 */
export class TravelTimeError extends Error {
  /** HTTP status code, when the failure came from an HTTP response. */
  readonly status?: number;
  /** TravelTime API error code, when the API provided one. */
  readonly errorCode?: number;
  readonly description: string;
  readonly documentationLink?: string;
  readonly additionalInfo?: Record<string, any>;
  readonly details?: string;
  /** True for 429, 5xx, and transport-level failures. */
  readonly isRetryable: boolean;

  constructor(params: TravelTimeErrorParams) {
    super(params.description);
    this.name = 'TravelTimeError';
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.description = params.description;
    this.documentationLink = params.documentationLink;
    this.additionalInfo = params.additionalInfo;
    this.details = params.details;
    this.isRetryable = params.isRetryable ?? isRetryableStatus(params.status);
    // Drop the constructor and factory frames so the stack starts at the caller
    Error.captureStackTrace?.(this, new.target);
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      errorCode: this.errorCode,
      description: this.description,
      documentationLink: this.documentationLink,
      additionalInfo: this.additionalInfo,
      details: this.details,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }

  static isTravelTimeError(error: unknown): error is TravelTimeError {
    return error instanceof TravelTimeError;
  }

  /**
   * Maps a failure from a JSON API request to a `TravelTimeError`.
   * Errors that are not TravelTime-shaped (timeouts, DNS failures,
   * proxy errors, non-JSON 5xx pages) become `TravelTimeNetworkError`.
   * Never returns the original error object.
   */
  static fromJsonError(error: unknown): TravelTimeError {
    if (error instanceof TravelTimeError) return error;
    const response = (error as any)?.response;
    const data = response?.data;
    if (isApiErrorPayload(data)) {
      return new TravelTimeError({
        status: typeof response.status === 'number' ? response.status : data.http_status,
        errorCode: data.error_code,
        description: data.description,
        documentationLink: data.documentation_link,
        additionalInfo: data.additional_info,
      });
    }
    return TravelTimeNetworkError.from(error);
  }

  /**
   * Maps a failure from a proto API request to a `TravelTimeError`,
   * reading the `x-error-code`, `x-error-message` and `x-error-details`
   * response headers. Failures without those headers become
   * `TravelTimeNetworkError`. Never returns the original error object.
   */
  static fromProtoError(error: unknown): TravelTimeError {
    if (error instanceof TravelTimeError) return error;
    if (axios.isAxiosError(error) && error.response) {
      const { headers, status } = error.response;
      const errorCode = headers?.['x-error-code'];
      const errorMessage = headers?.['x-error-message'];
      const errorDetails = headers?.['x-error-details'];
      if (errorCode !== undefined || errorMessage !== undefined) {
        return new TravelTimeError({
          status,
          errorCode: parseNumericHeader(errorCode),
          description: typeof errorMessage === 'string' && errorMessage.length > 0 ? errorMessage : `Proto request failed with status code ${status}`,
          details: typeof errorDetails === 'string' ? errorDetails : undefined,
        });
      }
    }
    return TravelTimeNetworkError.from(error);
  }
}

/**
 * Thrown for client-side validation failures, before any request is made.
 */
export class TravelTimeValidationError extends TravelTimeError {
  constructor(description: string) {
    super({ description, isRetryable: false });
    this.name = 'TravelTimeValidationError';
  }
}

export interface TravelTimeNetworkErrorParams {
  description: string;
  code?: string;
  status?: number;
  url?: string;
  isRetryable?: boolean;
}

/**
 * Thrown for transport-level failures (timeouts, DNS errors, aborted
 * connections) and for HTTP failures that do not carry a TravelTime
 * error body. Holds only primitive, credential-free diagnostics.
 */
export class TravelTimeNetworkError extends TravelTimeError {
  /** Low-level error code, e.g. `ECONNABORTED` or `ENOTFOUND`. */
  readonly code?: string;
  /** Request path, without the query string. */
  readonly url?: string;

  constructor(params: TravelTimeNetworkErrorParams) {
    super({
      description: params.description,
      status: params.status,
      isRetryable: params.isRetryable ?? (params.status === undefined ? true : isRetryableStatus(params.status)),
    });
    this.name = 'TravelTimeNetworkError';
    this.code = params.code;
    this.url = params.url;
  }

  toJSON(): Record<string, any> {
    return { ...super.toJSON(), code: this.code, url: this.url };
  }

  /**
   * Builds a sanitized `TravelTimeNetworkError` from an unknown failure,
   * copying only primitive diagnostics so that no headers, auth data, or
   * request/response objects can reach consumers.
   */
  static from(error: unknown): TravelTimeNetworkError {
    if (axios.isAxiosError(error)) {
      return new TravelTimeNetworkError({
        description: error.message || 'Request failed',
        code: error.code,
        status: error.response?.status,
        url: sanitizeUrl(error.config?.url),
      });
    }
    // Not an axios error, so no transport failure was observed — most likely a
    // local encode/decode or programming error, which retrying cannot fix
    if (error instanceof Error) {
      return new TravelTimeNetworkError({ description: error.message || error.name, isRetryable: false });
    }
    return new TravelTimeNetworkError({ description: typeof error === 'string' ? error : 'Unknown request failure', isRetryable: false });
  }
}
