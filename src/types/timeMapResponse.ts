import {
  TimeMapResponse, TimeMapResponseGeoJSON, TimeMapResponseVndBoundingBoxes, TimeMapResponseVndWkt,
} from './timeMap';

export type TimeMapResponseType = {
    'application/json': TimeMapResponse
    'application/vnd.wkt+json': TimeMapResponseVndWkt
    'application/vnd.wkt-no-holes+json': TimeMapResponseVndWkt
    'application/geo+json': TimeMapResponseGeoJSON
    'application/kml+xml': string
    'application/vnd.bounding-boxes+json': TimeMapResponseVndBoundingBoxes
}

export type TimeMapFastResponseType = Omit<TimeMapResponseType, 'application/kml+xml'>
