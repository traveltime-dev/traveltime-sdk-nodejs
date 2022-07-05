import {
  GeocodingRequestCommonParams,
} from './geocoding';

export type GeocodingSearchRequest = {
  'acceptLanguage'?: string
  'params': GeocodingRequestCommonParams & {
    'limit'?: number
    'force.add.postcode'?: boolean
  }
};
