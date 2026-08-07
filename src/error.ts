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
 * Reduces a request URL to origin + path, dropping the query string and
 * fragment so a recorded URL stays short and stable.
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
 * Extracts a low-level error code (`ENOTFOUND`, `ECONNREFUSED`, …) from the
 * `cause` of a native fetch failure. Connection failures against a host with
 * several addresses arrive as an `AggregateError`, so those are unwrapped.
 */
function extractCauseCode(cause: unknown): string | undefined {
  if (typeof cause !== 'object' || cause === null) return undefined;
  const { code } = cause as { code?: unknown };
  if (typeof code === 'string') return code;
  if (cause instanceof AggregateError) {
    return cause.errors.map((inner) => extractCauseCode(inner)).find((c) => c !== undefined);
  }
  return undefined;
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
   * Maps a non-2xx JSON API response to a `TravelTimeError`. `body` is the
   * parsed response body; bodies that are not TravelTime-shaped (non-JSON
   * 5xx pages, proxy errors) become `TravelTimeNetworkError`.
   */
  static fromJsonResponse(status: number, body: unknown, url?: string): TravelTimeError {
    if (isApiErrorPayload(body)) {
      return new TravelTimeError({
        status,
        errorCode: body.error_code,
        description: body.description,
        documentationLink: body.documentation_link,
        additionalInfo: body.additional_info,
      });
    }
    return new TravelTimeNetworkError({ description: `Request failed with status code ${status}`, status, url });
  }

  /**
   * Maps a non-2xx proto API response to a `TravelTimeError`, reading the
   * `x-error-code`, `x-error-message` and `x-error-details` response
   * headers. Responses without those headers become `TravelTimeNetworkError`.
   */
  static fromProtoResponse(status: number, headers: Headers, url?: string): TravelTimeError {
    const errorCode = headers.get('x-error-code');
    const errorMessage = headers.get('x-error-message');
    const errorDetails = headers.get('x-error-details');
    if (errorCode !== null || errorMessage !== null) {
      return new TravelTimeError({
        status,
        errorCode: parseNumericHeader(errorCode),
        description: errorMessage !== null && errorMessage.length > 0 ? errorMessage : `Proto request failed with status code ${status}`,
        details: errorDetails ?? undefined,
      });
    }
    return new TravelTimeNetworkError({ description: `Proto request failed with status code ${status}`, status, url });
  }

  /**
   * Last-resort wrapper for a thrown failure: an already-mapped error passes
   * through, anything else is sanitized into a `TravelTimeNetworkError`. Never
   * returns the original error object. Non-2xx responses do not throw under
   * fetch — those are mapped by `fromJsonResponse` / `fromProtoResponse`.
   */
  static from(error: unknown): TravelTimeError {
    if (error instanceof TravelTimeError) return error;
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
  /** Low-level error code, e.g. `ETIMEDOUT` or `ENOTFOUND`. */
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
    // Every URL recorded on an error goes through sanitizeUrl, so no call
    // site can log a query string by accident
    this.url = sanitizeUrl(params.url);
  }

  toJSON(): Record<string, any> {
    return { ...super.toJSON(), code: this.code, url: this.url };
  }

  /**
   * Builds a sanitized `TravelTimeNetworkError` from an unknown failure,
   * copying only primitive diagnostics so that no headers, auth data, or
   * request/response objects can reach consumers.
   */
  static from(error: unknown, url?: string): TravelTimeNetworkError {
    if (typeof error === 'object' && error !== null) {
      // Timeouts and aborts surface from fetch as DOMExceptions
      const { name } = error as { name?: unknown };
      if (name === 'TimeoutError') {
        return new TravelTimeNetworkError({
          description: 'Request timed out', code: 'ETIMEDOUT', url, isRetryable: true,
        });
      }
      if (name === 'AbortError') {
        return new TravelTimeNetworkError({
          description: 'Request was aborted', code: 'ABORT_ERR', url, isRetryable: false,
        });
      }
    }
    if (error instanceof Error) {
      const { cause } = error as { cause?: unknown };
      if (error instanceof TypeError && cause !== undefined) {
        // A native fetch transport failure: the message is a terse
        // 'fetch failed' and the useful detail lives on the cause. Copy only
        // its message and code — never the cause object itself.
        const code = extractCauseCode(cause);
        const causeMessage = cause instanceof Error && cause.message !== '' ? cause.message : undefined;
        return new TravelTimeNetworkError({
          description: causeMessage ?? (code !== undefined ? `${error.message} (${code})` : error.message),
          code,
          url,
          isRetryable: true,
        });
      }
      // No transport failure was observed — most likely a local
      // encode/decode or programming error, which retrying cannot fix
      return new TravelTimeNetworkError({ description: error.message || error.name, url, isRetryable: false });
    }
    return new TravelTimeNetworkError({ description: typeof error === 'string' ? error : 'Unknown request failure', url, isRetryable: false });
  }
}
