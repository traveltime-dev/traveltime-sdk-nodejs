import { Coords } from './common';
import {
  GeocodingRequestCommonParams,
} from './geocoding';

export type GeocodingBounds = {
  southEast: Coords,
  northWest: Coords
}

export type GeocodingSearchRequest = {
  acceptLanguage?: string
  params: GeocodingRequestCommonParams & {
    limit?: number
    'force.add.postcode'?: boolean
    bounds?: GeocodingBounds
  }
};
