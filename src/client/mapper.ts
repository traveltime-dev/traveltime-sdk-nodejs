import {
  TimeFilterFastRequest,
  TimeFilterFastRequestArrivalSearchBase,
  TimeFilterFastSimple,
  TimeFilterRequest,
  TimeFilterRequestSearchBase,
  TimeFilterSimple,
  TimeMapFastRequest,
  TimeMapFastRequestSearch,
  TimeMapFastSimple,
  TimeMapRequest, TimeMapRequestSearchBase, TimeMapSimple,
} from '../types';

export function timeMapSimpleToRequest(body: TimeMapSimple): TimeMapRequest {
  const searchBase : Omit<TimeMapRequestSearchBase, 'id' | 'coords'> = {
    transportation: body.transportation,
    travel_time: body.travelTime,
    level_of_detail: body.level_of_detail,
    no_holes: body.no_holes,
    properties: body.properties,
    range: body.range,
    single_shape: body.single_shape,
  };

  if (body.searchType === 'arrive') {
    return {
      arrival_searches: body.coords.map((coords, index) => ({
        ...searchBase,
        coords,
        id: `id-${index}`,
        arrival_time: body.leaveTime,
      })),
    };
  }
  return {
    departure_searches: body.coords.map((coords, index) => ({
      ...searchBase,
      coords,
      id: `id-${index}`,
      departure_time: body.leaveTime,
    })),
  };
}

export function timeMapFastSimpleToRequest(body: TimeMapFastSimple): TimeMapFastRequest {
  return {
    arrival_searches: {
      [body.searchType || 'one_to_many']: body.coords.map<TimeMapFastRequestSearch>((coords, index) => ({
        id: `id-${index}`,
        coords,
        transportation: { type: body.transport },
        arrival_time_period: 'weekday_morning',
        travel_time: body.travelTime,
        level_of_detail: body.level_of_detail,
      })),
    },
  };
}

export function timeFilterSimpleToRequest(body: TimeFilterSimple): TimeFilterRequest {
  const searchBase: Omit<TimeFilterRequestSearchBase, 'id'> = {
    properties: body.properties,
    transportation: body.transportation,
    travel_time: body.travelTime,
    range: body.range,
  };

  if (body.searchType === 'arrive') {
    return {
      locations: body.locations,
      arrival_searches: body.searchIds.map((search, index) => ({
        ...searchBase,
        id: `id-${index}`,
        arrival_location_id: search.one,
        departure_location_ids: search.many,
        arrival_time: body.leaveTime,
      })),
    };
  }

  return {
    locations: body.locations,
    departure_searches: body.searchIds.map((search, index) => ({
      ...searchBase,
      id: `id-${index}`,
      departure_location_id: search.one,
      arrival_location_ids: search.many,
      departure_time: body.leaveTime,
    })),
  };
}

export function timeFilterFastSimpleToRequest(body: TimeFilterFastSimple): TimeFilterFastRequest {
  const searchBase: Omit<TimeFilterFastRequestArrivalSearchBase, 'id'> = {
    transportation: body.transportation,
    travel_time: body.travelTime,
    properties: body.properties || ['travel_time'],
    arrival_time_period: 'weekday_morning',
  };

  if (body.searchType === 'many_to_one') {
    return {
      locations: body.locations,
      arrival_searches: {
        many_to_one: body.searchIds.map((search, index) => ({
          ...searchBase,
          id: `id-${index}`,
          departure_location_ids: search.many,
          arrival_location_id: search.one,
        })),
      },
    };
  }

  return {
    locations: body.locations,
    arrival_searches: {
      one_to_many: body.searchIds.map((search, index) => ({
        ...searchBase,
        id: `id-${index}`,
        arrival_location_ids: search.many,
        departure_location_id: search.one,
      })),
    },
  };
}
