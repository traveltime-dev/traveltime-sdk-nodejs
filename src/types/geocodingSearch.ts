import { Coords } from './common';

/**
 * Bounding box limiting geocoding search results. Sent as
 * `southEast.lat,southEast.lng,northWest.lat,northWest.lng`, which the API reads as
 * `min-lat,min-lng,max-lat,max-lng`.
 */
export type GeocodingBounds = {
  /** Its `lat` is sent as the minimum latitude and its `lng` as the minimum longitude. */
  southEast: Coords,
  /** Its `lat` is sent as the maximum latitude and its `lng` as the maximum longitude. */
  northWest: Coords
}

/** Optional settings for a geocoding search. */
export type GeocodingSearchRequest = {
  /** BCP47 language tag for the results, sent as `Accept-Language`. Falls back to English when unavailable. */
  acceptLanguage?: string
  /** Query parameters of the search. */
  params: {
    /** Maximum number of results, `1` to `50`. */
    limit?: number
    /** Force the postcode into the results. Only works when `within.country` is `CH`. */
    'force.add.postcode'?: boolean
    /** Only return results inside this bounding box. */
    bounds?: GeocodingBounds
    /** Only return results within these countries, as ISO 3166-1 alpha-2 or alpha-3 codes. */
    'within.country'?: string[] | string
    /** Format the `name` field as a human-readable address. Experimental. */
    'format.name'?: boolean
    /** Leave the country out of the formatted `name`. Only used when `format.name` is `true`. */
    'format.exclude.country'?: boolean
  }
};
