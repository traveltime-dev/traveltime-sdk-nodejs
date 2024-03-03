/* eslint-disable camelcase */
export interface TraveltimeErrorConstructor {
    http_status: number;
    error_code: number;
    description: string;
    documentation_link: string;
    additional_info: Record<string, any>
}

export class TravelTimeError extends Error {
  http_status: number;
  error_code: number;
  description: string;
  documentation_link: string;
  additional_info: Record<string, any>;

  constructor({
    http_status, error_code, description, documentation_link, additional_info,
  }: TraveltimeErrorConstructor) {
    super(description);
    this.name = 'TravelTimeError';
    this.http_status = http_status;
    this.error_code = error_code;
    this.description = description;
    this.documentation_link = documentation_link;
    this.additional_info = additional_info;
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
}
