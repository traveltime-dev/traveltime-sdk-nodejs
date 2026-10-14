import { TravelTimeError } from '../error';

/** A geographic point in WGS84 decimal degrees. */
export type Coords = {
  /** Latitude. */
  'lat': number;
  /** Longitude. */
  'lng': number;
}

/** Transportation modes accepted by the fast (`weekday_morning`) endpoints. */
export type TransportationFast = 'public_transport' | 'driving' | 'driving+public_transport' | 'driving+ferry' | 'cycling' | 'cycling+ferry' | 'walking' | 'walking+ferry'
/** Transportation modes without public transport, as accepted by Distance Map. */
export type TransportationTypeNoPt = 'walking' | 'cycling' | 'driving' | 'ferry' | 'cycling+ferry' | 'driving+ferry'
/**
 * Transportation modes accepted by the full (non-fast) endpoints.
 * `driving+train` is only available in Great Britain and France, `driving+public_transport` only in Great Britain,
 * and `cycling+public_transport` only in the Netherlands.
 */
export type TransportationType = 'cycling' | 'driving' | 'driving+train' | 'public_transport' | 'walking' | 'coach' | 'bus' | 'train' | 'ferry' | 'driving+ferry' | 'cycling+ferry' | 'cycling+public_transport' | 'driving+public_transport';
/** Mode used on a route part, distance breakdown item or fare breakdown item. */
export type RouteResponseTransportationMode = 'car' | 'parking' | 'boarding' | 'walk' | 'bike' | 'bike_parking' | 'train' | 'rail_national' | 'rail_overground' | 'rail_underground' | 'rail_dlr' | 'bus' | 'cable_car' | 'plane' | 'ferry' | 'coach';
/** Kind of route part; decides which optional route part fields are present. */
export type RoutesResponseRoutePartType = 'basic' | 'start_end' | 'road' | 'public_transport'
/** Validity period of a fare ticket. */
export type RoutesResponseFareTicketType = 'single' | 'week' | 'month' | 'year';
/** Traffic conditions for driving modes on the full endpoints. */
export type TrafficModel = 'balanced' | 'optimistic' | 'pessimistic'
/** Traffic conditions for driving modes on the fast endpoints. */
export type TrafficModelFast = 'peak' | 'off_peak'
/** Road types that are excluded by default and can be opted into with `include_roads`. */
export type IncludeRoadValues = 'track' | 'restricted'
/** Road types that are included by default and can be excluded with `exclude_roads`. */
export type ExcludeRoadValues = 'toll'

/** A location that searches reference by `id`. */
export type LocationRequest = {
  /** Location id, referenced by searches and echoed in the response. Must be unique among all locations. */
  'id': string;
  /** Coordinates of the location. */
  'coords': Coords;
}

/** Upper limit on the number of changes between public transport legs in a journey. */
export type MaxChangesRequest = {
  /** Whether the change limit is applied. */
  enabled: boolean
  /** Maximum number of changes between public transport legs. Must be at least `0`. */
  limit: number
}

/**
 * Transportation mode and its parameters for the full endpoints.
 * Only `type` is required; every other field falls back to an API default.
 */
export type TransportationRequestCommons = {
  /** Transportation mode. */
  'type': TransportationType
  /**
   * Additional road types to included when executing search. Only affects `driving` and `driving+ferry` transportation modes. Possible values:
   * - `track` - unpaved roads that only allow very slow driving speed or even require an off-road capable vehicle.
   * - `restricted` - roads that are not publicly accessible and may require a special permit. By default all of these roads are excluded from the search.
   */
  'include_roads'?: Array<IncludeRoadValues>
  /**
   * Road types to exclude from the search. Only affects `driving` and `driving+ferry` transportation modes. Possible values:
   * - `toll` - roads that require a fee to be paid by general traffic. By default these roads are included.
   */
  'exclude_roads'?: Array<ExcludeRoadValues>
  /** Set to `true` to disable crossing country borders. Only available with `driving`. Default `false`. */
  'disable_border_crossing'?: boolean
  /** Time in seconds needed to board a public transport vehicle. Default `0`. Used in public transport modes. */
  'pt_change_delay'?: number
  /**
   * Maximum walking time in seconds at the start and at the end of a public transport journey, each limited independently.
   * Default `900`. Cannot be higher than `travel_time`. Used in public transport modes.
   */
  'walking_time'?: number
  /** Maximum time in seconds for driving to the station. Default `1800`. Used in `driving+train` and `driving+public_transport`. */
  'driving_time_to_station'?: number
  /** Maximum time in seconds for cycling to the first stop. Default `900`. Used in `cycling+public_transport`. */
  'cycling_time_to_station'?: number
  /** Time in seconds needed to park a car or a bicycle. Default `300`. Used in `driving+train`, `driving+public_transport` and `cycling+public_transport`. */
  'parking_time'?: number
  /** Time in seconds needed to board a ferry. Default `0`. Used in ferry modes and `driving+public_transport` / `cycling+public_transport`. */
  'boarding_time'?: number
  /** Limit on changes between public transport legs. Ignored for modes without public transport. */
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

/** Transportation mode and its parameters for the fast endpoints. */
export type TransportationFastRequestCommons = {
  /** Transportation mode. */
  type: TransportationFast
  /**
   * Determines the level of traffic used in driving journeys. Possible values:
   * - `peak` (default) - represents the typical traffic conditions for a midweek morning.
   * - `off_peak` - represents the typical traffic conditions at night time.
   * Can only be specified with `driving+ferry` and `driving` transportation types.
   */
  'traffic_model'?: TrafficModelFast
  /**
   * Maximum time spent walking, in seconds.
   * Can only be specified with `public_transport` and `driving+public_transport` transportation types.
   */
  'walking_time'?: number
  /**
   * Maximum time spent driving to the station, in seconds.
   * Can only be specified with the `driving+public_transport` transportation type.
   */
  'driving_time_to_station'?: number
  /**
   * Time spent parking, in seconds.
   * Can only be specified with the `driving+public_transport` transportation type.
   */
  'parking_time'?: number
}

/** Transportation mode and its parameters for Distance Map, which has no public transport modes. */
export type TransportationNoPtRequestCommons = {
  /** Transportation mode. */
  'type': TransportationTypeNoPt
  /**
   * Additional road types to included when executing search. Only affects `driving` and `driving+ferry` transportation modes. Possible values:
   * - `track` - unpaved roads that only allow very slow driving speed or even require an off-road capable vehicle.
   * - `restricted` - roads that are not publicly accessible and may require a special permit. By default all of these roads are excluded from the search.
   */
  'include_roads'?: Array<IncludeRoadValues>
  /**
   * Road types to exclude from the search. Only affects `driving` and `driving+ferry` transportation modes. Possible values:
   * - `toll` - roads that require a fee to be paid by general traffic. By default these roads are included.
   */
  'exclude_roads'?: Array<ExcludeRoadValues>
  /** Set to `true` to disable crossing country borders. Only available with `driving`. Default `false`. */
  'disable_border_crossing'?: boolean
  /** Time in seconds needed to board a ferry. Default `0`. Cannot be higher than 1 hour. */
  'boarding_time'?: number
}

/** One leg of a returned route. */
export type ResponseRoutePart = {
  /** Sequential id, used to relate route parts to fare data. */
  'id': number;
  /** Kind of route part; decides which optional fields are present. */
  'type': RoutesResponseRoutePartType;
  /** Mode used on this part. */
  'mode': RouteResponseTransportationMode;
  /** Human-readable directions for this part. */
  'directions': string;
  /** Distance of this part in meters. */
  'distance': number;
  /** Travel time of this part in seconds. */
  'travel_time': number;
  /** Points along this part. */
  'coords': Array<Coords>;
  /** Only present when `type` is `start_end`. */
  'direction'?: string;
  /** Road name. May be present when `type` is `road`. */
  'road'?: string;
  /** Turn instruction. May be present when `type` is `road`. */
  'turn'?: string;
  /** Public transport line. Only present when `type` is `public_transport`. */
  'line'?: string;
  /** Boarding station. Only present when `type` is `public_transport`. */
  'departure_station'?: string;
  /** Alighting station. Only present when `type` is `public_transport`. */
  'arrival_station'?: string;
  /** Local departure time, `hh:mm`. Only present when `type` is `public_transport`. */
  'departs_at'?: string;
  /** Local arrival time, `hh:mm`. Only present when `type` is `public_transport`. */
  'arrives_at'?: string;
  /** Number of stops. Only present when `type` is `public_transport`. */
  'num_stops'?: number;
}

/** A full route, returned when the `route` property is requested. */
export type ResponseRoute = {
  /** Departure time of the route, extended ISO-8601. */
  'departure_time': string;
  /** Arrival time of the route, extended ISO-8601. */
  'arrival_time': string;
  /** Legs of the route, in travel order. */
  'parts': Array<ResponseRoutePart>;
}

/** A public transport fare ticket. */
export type ResponseFareTicket = {
  /** Validity period of the ticket. */
  'type': RoutesResponseFareTicketType;
  /** Ticket price in `currency`. */
  'price': number;
  /** ISO 4217 currency code. */
  'currency': string;
}

/** Fares for a group of route parts. */
export type ResponseFaresBreakdownItem = {
  /** Modes covered by these tickets. */
  'modes': Array<RouteResponseTransportationMode>;
  /** Ids of the route parts covered by these tickets. */
  'route_part_ids': Array<number>;
  /** Tickets for these route parts. */
  'tickets': Array<ResponseFareTicket>;
}

/** Fares for a journey, returned when the `fares` property is requested. UK only. */
export type ResponseFares = {
  /** Fares per group of route parts. */
  'breakdown': Array<ResponseFaresBreakdownItem>;
  /** Total fares for the whole journey, one per ticket type. */
  'tickets_total': Array<ResponseFareTicket>;
}

/**
 * Departure or arrival window: results cover journeys that depart (or arrive) within `width` seconds of the given time.
 * Disabled by default. Only used in public transport modes and ignored for others.
 */
export type RangeRequestNoMaxResults = {
  /** Whether the range search is applied. */
  'enabled': boolean
  /**
   * Width of the window in seconds: forwards from `departure_time`, or backwards from `arrival_time`.
   * Maximum `43200` (12 hours).
   */
  'width': number
}

/** Range search that returns several alternative results per location, sorted by `travel_time` ascending. */
export type RangeRequestFull = RangeRequestNoMaxResults & {
  /** Maximum number of results to return per location. Limited to `5`. */
  'max_results': number
}

/** Public transport data coverage of a map. Absent when public transport is not supported. */
export type TravelTimeResponseFeaturesPublicTransport = {
  /** Start of the public transport data period, extended ISO-8601. */
  'date_start': string;
  /** End of the public transport data period, extended ISO-8601. */
  'date_end': string;
}
/** Fast search direction: `arrival.many_to_one` or `arrival.one_to_many`. */
export type TravelTimeResponsePeriodSearchType = 'arrival.many_to_one' | 'arrival.one_to_many'
/** A search type and transportation mode supported by the fast endpoints. */
export type TravelTimeResponseFeatureSupportedTransport = {
  /** Supported search direction. */
  'search_type': TravelTimeResponsePeriodSearchType
  /** Supported transportation mode. */
  'transportation_mode': TransportationType
}
/** A time period supported by the fast endpoints and the modes available in it. */
export type TravelTimeResponseFeaturePeriod = {
  /** Arrival or departure time period, e.g. `weekday_morning`. */
  'time_period': string
  /** Search types and transportation modes available for this period. */
  'supported': Array<TravelTimeResponseFeatureSupportedTransport>
}
/** Time Filter (Fast) support. Absent when the fast endpoint is not supported. */
export type TravelTimeResponseFeatureTimeFilterFast = {
  /** Supported time periods and their modes. */
  'periods': Array<TravelTimeResponseFeaturePeriod>
}
/** Features that TravelTime supports for a map or location. */
export type TravelTimeResponseFeatureType = {
  /** Public transport support. Public transport is not supported when absent. */
  'public_transport'?: TravelTimeResponseFeaturesPublicTransport
  /** Time Filter (Fast) support. The fast endpoint is not supported when absent. */
  'time_filter_fast'?: TravelTimeResponseFeatureTimeFilterFast
  /** Transportation modes supported for cross-country searches. */
  'cross_country_modes'?: Array<TransportationType>
  /** Whether fare data is available. */
  'fares': boolean;
  /** Whether postcode searches are supported. */
  'postcodes': boolean;
}

/** Wrapper carrying the supported `features` of a map or location. */
export type TravelTimeResponseFeature = {
  /** Supported features. */
  'features': TravelTimeResponseFeatureType
};

/** Travel time statistics in seconds. */
export type TravelTimeResponseStatistics = {
  /** Minimum travel time in seconds. */
  'min': number;
  /** Maximum travel time in seconds. */
  'max': number;
  /** Mean travel time in seconds. */
  'mean': number;
  /** Median travel time in seconds. */
  'median': number;
}

/** Simplifies the shape to a grid of squares. Availability depends on the licence plan. */
export type CoarseGridLevelOfDetail = {
  /** Selects the coarse grid scale. */
  scale_type: 'coarse_grid'
  /** Side length of the grid squares in meters; larger is less detailed. Minimum `600`. */
  square_size: number
}

/** Level of detail as a named level. */
export type SimpleLevelOfDetail = {
  /** Selects the named-level scale. */
  scale_type: 'simple',
  /** From least (`lowest`) to most (`highest`) detailed. */
  level: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
}

/** Level of detail as a number; an extension of the simple scale. */
export type SimpleNumericLevelOfDetail = {
  /** Selects the numeric scale. */
  scale_type: 'simple_numeric',
  /** Integer from `-20` to `2`; lower is less detailed. `-2` to `2` match `lowest` to `highest`. */
  level: number
}

/** Level of detail of the returned shape. */
export type LevelOfDetail = CoarseGridLevelOfDetail | SimpleLevelOfDetail| SimpleNumericLevelOfDetail

/** API credentials from the TravelTime Developer Portal. */
export type Credentials = {
  /** Application key. */
  apiKey: string,
  /** Application id. */
  applicationId: string
}

/** A failed request in a batch. */
export interface BatchErrorResponse {
  /** The error the request failed with. */
  error: TravelTimeError;
  /** Discriminator for a failed request. */
  type: 'error';
}

/** A successful request in a batch. */
export interface BatchSuccessResponse<T> {
  /** The endpoint's response. */
  body: T;
  /** Discriminator for a successful request. */
  type: 'success';
}

/** Outcome of one request in a batch call; narrow it with `isBatchError`. */
export type BatchResponse<T> = BatchErrorResponse | BatchSuccessResponse<T>;
export type GenericFunction = (...args: any) => any

/** A latitude/longitude bounding box. */
export type BoundingBox = {
  /** Southern edge latitude. */
  min_lat: number,
  /** Northern edge latitude. */
  max_lat: number,
  /** Western edge longitude. */
  min_lng: number,
  /** Eastern edge longitude. */
  max_lng: number,
}

/** A GeoJSON position, `[lng, lat]`. */
export type Position = number[];

/** Limits the polygons returned in a single shape. */
export type PolygonsFilter = {
  /** Return at most this many of the largest polygons. Must be greater than `0`. */
  limit: number
}

/** Adds the optional `snapping` field to a search. */
export type Snapping = {
  /** Adjusts how the nearest roads to the departure and arrival points are found. */
  snapping?: {
    /**
     * Default - `enabled`
     * - `enabled` - walking time and distance to and from the nearest road are added to the journey totals.
     * - `disabled` - they are not added; the journey effectively starts and ends on the road network.
     */
    penalty?: 'enabled' | 'disabled'
    /**
     * Default - `both_drivable_and_walkable`
     * - `both_drivable_and_walkable` - journeys can only start or end on roads open to both cars and pedestrians, so not on motorways.
     * - `any_drivable` - journeys can start or end on any road open to cars, motorways included.
     */
    accept_roads?: 'both_drivable_and_walkable' | 'any_drivable'
    /** Default - `1000`. Maximum distance in meters between a search point and the nearest road usable by the selected mode. */
    threshold?: number
  }
}

/** A union or intersection of the shapes of earlier searches. */
export type UnionOrIntersection = {
  /** Id of the result. Must be unique among all searches. */
  id: string;
  /** Ids of the searches whose shapes are combined. */
  search_ids: Array<string>;
}
