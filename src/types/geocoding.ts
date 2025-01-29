import {
  TravelTimeResponseFeature,
} from './common';

export type GeocodingResponseGeometry = {
  'type': 'Point',
  'coordinates': [number, number]
}

export type GeocodingResponseProperties = TravelTimeResponseFeature & {
  name: string
  label: string
  type: string
  category: string
  score?: number
  house_number?: string
  street?: string
  region?: string
  region_code?: string
  neighbourhood?: string
  county?: string
  macroregion?: string
  city?: string
  town?: string
  district?: string
  country?: string
  local_admin?: string
  country_code?: string
  continent?: string
  postcode?: string
}

export type GeocodingResponseFeature = {
  'type': 'Feature',
  'attribution': string,
  'geometry': GeocodingResponseGeometry
  properties: GeocodingResponseProperties
}

export type GeocodingResponse = {
  type: 'FeatureCollection'
  features: Array<GeocodingResponseFeature>
}
