import {
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
