export type Coords = {
  'lat': number;
  'lng': number;
}

export type TransportationType = 'cycling' | 'driving' | 'driving+train' | 'public_transport' | 'walking' | 'coach' | 'bus' | 'train' | 'ferry' | 'driving+ferry' | 'cycling+ferry' | 'cycling+public_transport';
export type RouteResponseTransportationMode = 'car' | 'parking' | 'boarding' | 'walk' | 'bike' | 'bike_parking' | 'train' | 'rail_national' | 'rail_overground' | 'rail_underground' | 'rail_dlr' | 'bus' | 'cable_car' | 'plane' | 'ferry' | 'coach';
export type RoutesResponseRoutePartType = 'basic' | 'start_end' | 'road' | 'public_transport'
export type RoutesResponseFareTicketType = 'single' | 'week' | 'month' | 'year';

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
  'disable_border_crossing'?: boolean
  'pt_change_delay'?: number
  'walking_time'?: number
  'driving_time_to_station'?: number
  'cycling_time_to_station'?: number
  'parking_time'?: number
  'boarding_time'?: number
  'max_changes'?: MaxChangesRequest
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
