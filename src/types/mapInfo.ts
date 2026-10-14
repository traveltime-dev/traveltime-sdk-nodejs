import {
  TravelTimeResponseFeature,
} from './common';

/** A map TravelTime covers and the features it supports. */
export type MapInfoResponseMap = TravelTimeResponseFeature & {
  /** Internal map id, usually starting with the two-letter country code, e.g. `ie` or `us_pst`. */
  'name': string
}

/** Map Info response. */
export type MapInfoResponse = {
  /** Every map TravelTime covers. */
  'maps': Array<MapInfoResponseMap>
};
