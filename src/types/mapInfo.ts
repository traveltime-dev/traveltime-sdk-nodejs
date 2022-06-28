import {
  TravelTimeResponseFeature,
} from './common';

export type MapInfoResponseMap = TravelTimeResponseFeature & {
  'name': string
}

export type MapInfoResponse = {
  'maps': Array<MapInfoResponseMap>
};
