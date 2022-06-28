import {
  GeocodingRequestCommonParams,
} from './geocoding';

export type GeocodingSearchRequest = {
  'acceptLanguage'?: string
  'params': GeocodingRequestCommonParams & {
    'query': string
    'limit'?: number
    'force.add.postcode'?: boolean
  }
};
