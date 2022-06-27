import {
  TravelTimeResponseFeature,
} from './common';

export type GeocodingRequestCommonParams = {
  'within.country'?: string
  'exclude.location.types'?: 'country'
}

export type GeocodingResponseGeometry = {
  'type': 'Point',
  'coordinates': [number, number]
}

export type GeocodingResponseProperties = TravelTimeResponseFeature & {
  name: string
  label: string
  score?: number
  house_number?: string
  street?: string
  region?: string
  region_code?: string
  neighbourhood?: string
  county?: string
  macroregion?: string
  city?: string
  country?: string
  country_code?: string
  continent?: string
  postcode?: string
}

export type GeocodingResponseFeature = {
  'type': 'Feature',
  'geometry': GeocodingResponseGeometry
  properties: GeocodingResponseProperties
}

export type GeocodingResponse = {
  type: 'FeatureCollection'
  features: Array<GeocodingResponseFeature>
}
