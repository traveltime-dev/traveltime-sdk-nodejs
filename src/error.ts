/* eslint-disable camelcase */
import axios from 'axios';

export interface TraveltimeErrorConstructor {
    http_status: number;
    error_code: number;
    description: string;
    documentation_link: string;
    additional_info: Record<string, any>
    details?: string;
}

export class TravelTimeError extends Error {
  http_status: number;
  error_code: number;
  description: string;
  documentation_link: string;
  additional_info: Record<string, any>;
  details?: string;

  constructor({
    http_status, error_code, description, documentation_link, additional_info, details,
  }: TraveltimeErrorConstructor) {
    super(description);
    this.name = 'TravelTimeError';
    this.http_status = http_status;
    this.error_code = error_code;
    this.description = description;
    this.documentation_link = documentation_link;
    this.additional_info = additional_info;
    this.details = details;
  }

  static isTravelTimeError(payload: any): payload is TraveltimeErrorConstructor {
    return !!payload && (!!payload.error_code && !!payload.description);
  }

  static makeError(error: any) {
    const errorData = error?.response?.data;
    if (this.isTravelTimeError(errorData)) {
      return new TravelTimeError(errorData);
    }
    return error;
  }

  static makeProtoError(error: unknown) {
    if (!axios.isAxiosError(error) || !error.response) return error;

    const { headers, status } = error.response;
    const errorCode = headers['x-error-code'];
    const errorMessage = headers['x-error-message'];
    const errorDetails = headers['x-error-details'];

    if (errorCode !== undefined || errorMessage !== undefined) {
      return new TravelTimeError({
        http_status: status,
        error_code: Number(errorCode),
        description: errorMessage ?? '',
        documentation_link: '',
        additional_info: {},
        details: errorDetails,
      });
    }
    return error;
  }
}
