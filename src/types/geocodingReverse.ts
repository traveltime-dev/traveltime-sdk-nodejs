export type GeocodingReverseRequest = {
  acceptLanguage?: string
  params: {
    lat: number,
    lng: number,
    'within.country'?: string
  }
};
