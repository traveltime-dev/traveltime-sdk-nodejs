export type Coords = {
  'lat': number;
  'lng': number;
}

export type TransportationFast = 'public_transport' | 'driving' | 'driving+public_transport' | 'driving+ferry' | 'cycling' | 'cycling+ferry' | 'walking' | 'walking+ferry'
export type TransportationTypeNoPt = 'walking' | 'cycling' | 'driving' | 'ferry' | 'cycling+ferry' | 'driving+ferry'
export type TransportationType = 'cycling' | 'driving' | 'driving+train' | 'public_transport' | 'walking' | 'coach' | 'bus' | 'train' | 'ferry' | 'driving+ferry' | 'cycling+ferry' | 'cycling+public_transport' | 'driving+public_transport';
export type RouteResponseTransportationMode = 'car' | 'parking' | 'boarding' | 'walk' | 'bike' | 'bike_parking' | 'train' | 'rail_national' | 'rail_overground' | 'rail_underground' | 'rail_dlr' | 'bus' | 'cable_car' | 'plane' | 'ferry' | 'coach';
export type RoutesResponseRoutePartType = 'basic' | 'start_end' | 'road' | 'public_transport'
export type RoutesResponseFareTicketType = 'single' | 'week' | 'month' | 'year';
export type TrafficModel = 'balanced' | 'optimistic' | 'pessimistic'
export type TrafficModelFast = 'peak' | 'off_peak'
export type IncludeRoadValues = 'track' | 'restricted'

export type LocationRequest = {
  'id': string;
  'coords': Coords;
}

export type MaxChangesRequest = {
  enabled: boolean
  limit: number
}

export type TransportationRequestCommons = {
  'type': TransportationType
  /**
   * Additional road types to included when executing search. Only affects `driving` and `driving+ferry` transportation modes. Possible values:
   * - `track` - unpaved roads that only allow very slow driving speed or even require an off-road capable vehicle.
   * - `restricted` - roads that are not publicly accessible and may require a special permit. By default all of these roads are excluded from the search.
   */
  'include_roads'?: Array<IncludeRoadValues>
  'disable_border_crossing'?: boolean
  'pt_change_delay'?: number
  'walking_time'?: number
  'driving_time_to_station'?: number
  'cycling_time_to_station'?: number
  'parking_time'?: number
  'boarding_time'?: number
  'max_changes'?: MaxChangesRequest
  /**
   * Specifies how traffic conditions are accounted for in driving modes. The full impact depends on the typical traffic conditions for the specific area and time of day - when congestion is higher (e.g in more urban areas, and at busier times of the day) the parameter will have a bigger impact.
   * - `balanced` (default) - uses typical traffic conditions for the chosen time of day.
   * - `optimistic` - uses lighter traffic conditions for the chosen time of day, resulting in shorter travel times.
   * - `pessimistic` - uses heavier traffic conditions for the chosen time of day, resulting in longer travel times.
   *
   * Used in `driving`, `driving+ferry`, `driving+train`, and `driving+public_transport` transportation modes.
   */
  'traffic_model'?: TrafficModel
}

export type TransportationFastRequestCommons = {
  type: TransportationFast
  /**
   * Determines the level of traffic used in driving journeys. Possible values:
   * - `peak` (default) - represents the typical traffic conditions for a midweek morning.
   * - `off_peak` - represents the typical traffic conditions at night time.
   * Can only be specified with `driving+ferry` and `driving` transportation types.
   */
  'traffic_model'?: TrafficModelFast
}

export type TransportationNoPtRequestCommons = {
  'type': TransportationTypeNoPt
  /**
   * Additional road types to included when executing search. Only affects `driving` and `driving+ferry` transportation modes. Possible values:
   * - `track` - unpaved roads that only allow very slow driving speed or even require an off-road capable vehicle.
   * - `restricted` - roads that are not publicly accessible and may require a special permit. By default all of these roads are excluded from the search.
   */
  'include_roads'?: Array<IncludeRoadValues>
  'disable_border_crossing'?: boolean
  'boarding_time'?: number
}

export type ResponseRoutePart = {
  'id': number;
  'type': RoutesResponseRoutePartType;
  'mode': RouteResponseTransportationMode;
  'directions': string;
  'distance': number;
  'travel_time': number;
  'coords': Array<Coords>;
  'direction'?: string;
  'road'?: string;
  'turn'?: string;
  'line'?: string;
  'departure_station'?: string;
  'arrival_station'?: string;
  'departs_at'?: string;
  'arrives_at'?: string;
  'num_stops'?: number;
}

export type ResponseRoute = {
  'departure_time': string;
  'arrival_time': string;
  'parts': Array<ResponseRoutePart>;
}

export type ResponseFareTicket = {
  'type': RoutesResponseFareTicketType;
  'price': number;
  'currency': string;
}

export type ResponseFaresBreakdownItem = {
  'modes': Array<RouteResponseTransportationMode>;
  'route_part_ids': Array<number>;
  'tickets': Array<ResponseFareTicket>;
}

export type ResponseFares = {
  'breakdown': Array<ResponseFaresBreakdownItem>;
  'tickets_total': Array<ResponseFareTicket>;
}

export type RangeRequestNoMaxResults = {
  'enabled': boolean
  'width': number
}

export type RangeRequestFull = RangeRequestNoMaxResults & {
  'max_results': number
}

export type TravelTimeResponseFeaturesPublicTransport = {
  'date_start': string;
  'date_end': string;
}
export type TravelTimeResponsePeriodSearchType = 'arrival.many_to_one' | 'arrival.one_to_many'
export type TravelTimeResponseFeatureSupportedTransport = {
  'search_type': TravelTimeResponsePeriodSearchType
  'transportation_mode': TransportationType
}
export type TravelTimeResponseFeaturePeriod = {
  'time_period': string
  'supported': Array<TravelTimeResponseFeatureSupportedTransport>
}
export type TravelTimeResponseFeatureTimeFilterFast = {
  'periods': Array<TravelTimeResponseFeaturePeriod>
}
export type TravelTimeResponseFeatureType = {
  'public_transport'?: TravelTimeResponseFeaturesPublicTransport
  'time_filter_fast'?: TravelTimeResponseFeatureTimeFilterFast
  'cross_country_modes'?: Array<TransportationType>
  'fares': boolean;
  'postcodes': boolean;
}

export type TravelTimeResponseFeature = {
  'features': TravelTimeResponseFeatureType
};

export type TravelTimeResponseStatistics = {
  'min': number;
  'max': number;
  'mean': number;
  'median': number;
}

export type CoarseGridLevelOfDetail = {
  scale_type: 'coarse_grid'
  square_size: number
}

export type SimpleLevelOfDetail = {
  scale_type: 'simple',
  level: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
}

export type SimpleNumericLevelOfDetail = {
  scale_type: 'simple_numeric',
  level: number
}

export type LevelOfDetail = CoarseGridLevelOfDetail | SimpleLevelOfDetail| SimpleNumericLevelOfDetail

export type Credentials = { apiKey: string, applicationId: string }

export interface BatchErrorResponse {
  error: Error;
  type: 'error';
}

export interface BatchSuccessResponse<T> {
  body: T;
  type: 'success';
}

export type BatchResponse<T> = BatchErrorResponse | BatchSuccessResponse<T>;
export type GenericFunction = (...args: any) => any

export type BoundingBox = {
  min_lat: number,
  max_lat: number,
  min_lng: number,
  max_lng: number,
}

export type Position = number[];

export type PolygonsFilter = {
  limit: number
}

export type Snapping = {
  snapping?: {
    /** Default - `enabled` */
    penalty?: 'enabled' | 'disabled'
    /** Default - `both_drivable_and_walkable` */
    accept_roads?: 'both_drivable_and_walkable' | 'any_drivable'
    /** Default - `1000` */
    threshold?: number
  }
}

export type UnionOrIntersection = {
  id: string;
  search_ids: Array<string>;
}
