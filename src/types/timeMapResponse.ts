import {
  TimeMapResponse, TimeMapResponseGeoJSON, TimeMapResponseVndBoundingBoxes, TimeMapResponseVndWkt,
} from './timeMap';

/** Time Map response body for each supported `Accept` format. */
export type TimeMapResponseType = {
    /** Shapes as coordinate arrays. Default. */
    'application/json': TimeMapResponse
    /** Shapes as Well-known text. */
    'application/vnd.wkt+json': TimeMapResponseVndWkt
    /** Shapes as Well-known text, without holes. */
    'application/vnd.wkt-no-holes+json': TimeMapResponseVndWkt
    /** GeoJSON FeatureCollection of MultiPolygons. */
    'application/geo+json': TimeMapResponseGeoJSON
    /** KML document, returned as a raw string. */
    'application/kml+xml': string
    /** KML document, returned as a raw string. */
    'application/vnd.google-earth.kml+xml': string
    /** Shapes as bounding boxes, without holes. */
    'application/vnd.bounding-boxes+json': TimeMapResponseVndBoundingBoxes
}

/** Time Map (Fast) response body for each supported `Accept` format; the KML formats are excluded. */
export type TimeMapFastResponseType = Omit<TimeMapResponseType, 'application/kml+xml' | 'application/vnd.google-earth.kml+xml'>
