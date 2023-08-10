import {
  DistanceMapResponse,
  DistanceMapResponseGeoJSON,
  DistanceMapResponseVndBoundingBoxes,
  DistanceMapResponseVndWkt,
} from './distanceMap';

export type DistanceMapResponseType = {
  'application/json': DistanceMapResponse
  'application/vnd.wkt+json': DistanceMapResponseVndWkt
  'application/vnd.wkt-no-holes+json': DistanceMapResponseVndWkt
  'application/geo+json': DistanceMapResponseGeoJSON
  'application/kml+xml': string
  'application/vnd.bounding-boxes+json': DistanceMapResponseVndBoundingBoxes
}
