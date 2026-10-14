import {
  TravelTimeResponseFeature,
} from './common';

/** GeoJSON point geometry of a geocoding result. */
export type GeocodingResponseGeometry = {
  /** GeoJSON geometry type. */
  'type': 'Point',
  /** Coordinates as `[lng, lat]`. */
  'coordinates': [number, number]
}

/** Address details of a geocoding result. */
export type GeocodingResponseProperties = TravelTimeResponseFeature & {
  /** Human-readable address of the location. Experimental. */
  name: string
  /** Full comma-separated address, made of the names of all enclosing regions. */
  label: string
  /** Result type. */
  type: string
  /** Result category. */
  category: string
  /** Confidence score of the result, at most `1`. */
  score?: number
  /** House number. */
  house_number?: string
  /** Street name. */
  street?: string
  /** Region name. */
  region?: string
  /** Region code. */
  region_code?: string
  /** Neighbourhood name. */
  neighbourhood?: string
  /** County name. */
  county?: string
  /** Macroregion name. */
  macroregion?: string
  /** City name. */
  city?: string
  /** Town name. */
  town?: string
  /** District name. */
  district?: string
  /** Country name. */
  country?: string
  /** Local administrative area name. */
  local_admin?: string
  /** ISO 3166-1 alpha-3 country code. */
  country_code?: string
  /** Continent name. */
  continent?: string
  /** Postcode. */
  postcode?: string
}

/** A single geocoding result. */
export type GeocodingResponseFeature = {
  /** GeoJSON object type. */
  'type': 'Feature',
  /** Data attribution. */
  'attribution': string,
  /** Location of the result. */
  'geometry': GeocodingResponseGeometry
  /** Address details and supported TravelTime features at the location. */
  properties: GeocodingResponseProperties
}

/** Geocoding search and reverse geocoding response, a GeoJSON FeatureCollection. */
export type GeocodingResponse = {
  /** GeoJSON object type. */
  type: 'FeatureCollection'
  /** Matching results. */
  features: Array<GeocodingResponseFeature>
}
