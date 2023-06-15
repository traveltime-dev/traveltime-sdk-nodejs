import crypto from 'node:crypto';
import {
  TimeMapRequest, TimeMapRequestSearchBase, TimeMapSimple,
} from '../types';

export function timeMapSimpleToRequest(body: TimeMapSimple): TimeMapRequest {
  const searchBases = body.coords.map<TimeMapRequestSearchBase>((coords) => ({
    id: crypto.randomUUID(),
    coords,
    transportation: body.transportation,
    travel_time: body.travelTime,
    level_of_detail: body.level_of_detail,
    no_holes: body.no_holes,
    properties: body.properties,
    range: body.range,
    single_shape: body.single_shape,
  }));

  if (body.searchType === 'arrive') {
    return {
      arrival_searches: searchBases.map((base) => ({ ...base, arrival_time: body.leaveTime })),
    };
  }
  return {
    departure_searches: searchBases.map((base) => ({ ...base, departure_time: body.leaveTime })),
  };
}
