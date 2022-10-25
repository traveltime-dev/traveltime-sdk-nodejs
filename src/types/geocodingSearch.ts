import { Coords } from './common';

export type GeocodingBounds = {
  southEast: Coords,
  northWest: Coords
}

export type GeocodingSearchRequest = {
  acceptLanguage?: string
  params: {
    limit?: number
    'force.add.postcode'?: boolean
    bounds?: GeocodingBounds
    'within.country'?: string
    'format.name'?: boolean
    'format.exclude.country'?: boolean
  }
};
