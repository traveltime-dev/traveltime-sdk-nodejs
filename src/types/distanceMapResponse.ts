import {
  DistanceMapResponse,
  DistanceMapResponseGeoJSON,
  DistanceMapResponseVndBoundingBoxes,
  DistanceMapResponseVndWkt,
} from './distanceMap';

/** Distance Map response body for each supported `Accept` format. */
export type DistanceMapResponseType = {
  /** Shapes as coordinate arrays. Default. */
  'application/json': DistanceMapResponse
  /** Shapes as Well-known text. */
  'application/vnd.wkt+json': DistanceMapResponseVndWkt
  /** Shapes as Well-known text, without holes. */
  'application/vnd.wkt-no-holes+json': DistanceMapResponseVndWkt
  /** GeoJSON FeatureCollection of MultiPolygons. */
  'application/geo+json': DistanceMapResponseGeoJSON
  /** KML document, returned as a raw string. */
  'application/kml+xml': string
  /** Shapes as bounding boxes, without holes. */
  'application/vnd.bounding-boxes+json': DistanceMapResponseVndBoundingBoxes
}
