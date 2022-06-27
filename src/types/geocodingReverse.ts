import {
  GeocodingRequestCommonParams,
} from './geocoding';

export type GeocodingReverseRequest = {
  'acceptLanguage'?: string
  'params': GeocodingRequestCommonParams & {
    'lat': number
    'lng': number
  }
};
