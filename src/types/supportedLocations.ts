import {
  Coords,
} from './common';

export type SupportedLocationsRequestLocation = {
  id: string
  coords: Coords
}

export type SupportedLocationsRequest = {
  locations: Array<SupportedLocationsRequestLocation>
};

export type SupportedLocationsResponseLocation = {
  'id': string;
  'map_name': string;
  'additional_map_names': Array<string>
}

export type SupportedLocationsResponse = {
  'locations': Array<SupportedLocationsResponseLocation>;
  'unsupported_locations': Array<string>;
}
