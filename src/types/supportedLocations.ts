import {
  Coords,
} from './common';

/** A location to check for coverage. */
export type SupportedLocationsRequestLocation = {
  /** Location id, echoed in the response. */
  id: string
  /** Coordinates of the location. */
  coords: Coords
}

/** Supported Locations request body. */
export type SupportedLocationsRequest = {
  /** Locations to check. */
  locations: Array<SupportedLocationsRequestLocation>
};

/** A supported location and the map that covers it. */
export type SupportedLocationsResponseLocation = {
  /** Location id from the request. */
  'id': string;
  /** Internal id of the map covering the location, usually starting with the two-letter country code. */
  'map_name': string;
  /** Other maps covering the location, when it is in more than one. */
  'additional_map_names': Array<string>
}

/** Supported Locations response. */
export type SupportedLocationsResponse = {
  /** Locations covered by a map. */
  'locations': Array<SupportedLocationsResponseLocation>;
  /** Ids of the locations no map covers. */
  'unsupported_locations': Array<string>;
}
