/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
import {
  BatchErrorResponse,
  BatchResponse,
  DistanceMapRequest,
  DistanceMapRequestSearchBase,
  RoutesRequest,
  RoutesRequestSearchBase,
  TimeFilterFastRequest,
  TimeFilterFastRequestArrivalSearchBase,
  TimeFilterFastRequestProperty,
  TimeFilterFastResponse,
  TimeFilterFastSimple,
  TimeFilterRequest,
  TimeFilterRequestSearchBase,
  TimeFilterSimple,
  TimeMapFastRequest,
  TimeMapFastRequestSearch,
  TimeMapFastSimple,
  TimeMapRequest,
  TimeMapRequestSearchBase,
  TimeMapSimple,
} from '../types';
import { DistanceMapSimple } from '../types/distanceMapSimple';
import { RoutesSimple } from '../types/routesSimple';
import { TimeFilterFastManyToManyMatrixRequest, TimeFilterFastManyToManyMatrixResponse } from '../types/timeFilterFastMatrix';

export function timeMapSimpleToRequest(body: TimeMapSimple): TimeMapRequest {
  const searchBase : Omit<TimeMapRequestSearchBase, 'id' | 'coords'> = {
    transportation: body.transportation,
    travel_time: body.travelTime,
    level_of_detail: body.level_of_detail,
    no_holes: body.no_holes,
    properties: body.properties,
    range: body.range,
    single_shape: body.single_shape,
    polygons_filter: body.polygons_filter,
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
      arrival_searches: Object.entries(body.searchIds).map((search, index) => ({
        ...searchBase,
        id: `id-${index}`,
        arrival_location_id: search[0],
        departure_location_ids: search[1],
        arrival_time: body.leaveTime,
      })),
    };
  }

  return {
    locations: body.locations,
    departure_searches: Object.entries(body.searchIds).map((search, index) => ({
      ...searchBase,
      id: `id-${index}`,
      departure_location_id: search[0],
      arrival_location_ids: search[1],
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
        many_to_one: Object.entries(body.searchIds).map((search, index) => ({
          ...searchBase,
          id: `id-${index}`,
          departure_location_ids: search[1],
          arrival_location_id: search[0],
        })),
      },
    };
  }

  return {
    locations: body.locations,
    arrival_searches: {
      one_to_many: Object.entries(body.searchIds).map((search, index) => ({
        ...searchBase,
        id: `id-${index}`,
        arrival_location_ids: search[1],
        departure_location_id: search[0],
      })),
    },
  };
}

export function routesSimpleToRequest(body: RoutesSimple): RoutesRequest {
  const searchBase: Omit<RoutesRequestSearchBase, 'id'> = {
    properties: body.properties,
    transportation: body.transportation,
    range: body.range,
  };

  if (body.searchType === 'arrive') {
    return {
      locations: body.locations,
      arrival_searches: Object.entries(body.searchIds).map((search, index) => ({
        ...searchBase,
        id: `id-${index}`,
        departure_location_ids: search[1],
        arrival_location_id: search[0],
        arrival_time: body.leaveTime,
      })),
    };
  }

  return {
    locations: body.locations,
    departure_searches: Object.entries(body.searchIds).map((search, index) => ({
      ...searchBase,
      id: `id-${index}`,
      arrival_location_ids: search[1],
      departure_location_id: search[0],
      departure_time: body.leaveTime,
    })),
  };
}

export function distanceMapSimpleToRequest(body: DistanceMapSimple): DistanceMapRequest {
  const searchBase : Omit<DistanceMapRequestSearchBase, 'id' | 'coords'> = {
    transportation: body.transportation,
    travel_distance: body.travelDistance,
    level_of_detail: body.level_of_detail,
    no_holes: body.no_holes,
    single_shape: body.single_shape,
    polygons_filter: body.polygons_filter,
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

export function timeFilterFastManyToManyMatrixToRequest(body: TimeFilterFastManyToManyMatrixRequest): TimeFilterFastRequest[] {
  const MAX_SEARCHES_LIMIT = 100_000;
  const maxSearchesPerRequest = body.maxSearchesPerRequest || MAX_SEARCHES_LIMIT;
  if (maxSearchesPerRequest > MAX_SEARCHES_LIMIT) {
    throw new Error('Max number of searches is 100_000');
  }
  const requests: TimeFilterFastRequest[] = [];
  body.coordsFrom.forEach((coordsFrom, iFrom) => {
    for (let index = 0; index < body.coordsTo.length; index += maxSearchesPerRequest) {
      const chunk = body.coordsTo.slice(index, index + maxSearchesPerRequest);
      requests.push({
        locations: [
          { id: `from-${iFrom}`, coords: coordsFrom },
          ...chunk.map((coordsTo, iTo) => ({ id: `to-${iTo + index}`, coords: coordsTo })),
        ],
        arrival_searches: {
          one_to_many: [{
            id: `from-${iFrom}-chunk-${index}`,
            departure_location_id: `from-${iFrom}`,
            arrival_location_ids: chunk.map((_, iTo) => `to-${iTo + index}`),
            arrival_time_period: 'weekday_morning',
            properties: body.properties || ['travel_time'],
            transportation: body.transportation,
            travel_time: body.travelTime,
          }],
        },
      });
    }
  });
  return requests;
}

export function timeFilterFastManyToManyMatrixResponseMapper(responses: BatchResponse<TimeFilterFastResponse>[], sizeFrom: number, sizeTo: number, properties: TimeFilterFastRequestProperty[]): TimeFilterFastManyToManyMatrixResponse {
  const timeArray = properties.includes('travel_time') ? Array.from({ length: sizeFrom }, () => Array<null | number>(sizeTo).fill(null)) : undefined;
  const distanceArray = properties.includes('distance') ? Array.from({ length: sizeFrom }, () => Array<null | number>(sizeTo).fill(null)) : undefined;
  responses.forEach((response) => {
    if (response.type === 'success') {
      const resp = response.body.results[0];
      const rgx = /.*-(\d+)-.*(\d+)/;
      const rgxMatch = rgx.exec(resp.search_id);
      if (rgxMatch) {
        const primaryIndex = Number.parseInt(rgxMatch[1], 10);
        const unreachableIndexes = resp.unreachable.map((_) => Number.parseInt(_.substring(3), 10));
        unreachableIndexes.forEach((i) => {
          if (timeArray) timeArray[primaryIndex][i] = -1;
          if (distanceArray) distanceArray[primaryIndex][i] = -1;
        });
        resp.locations.forEach((location) => {
          const i = Number.parseInt(location.id.substring(3), 10);
          if (timeArray) timeArray[primaryIndex][i] = location.properties.travel_time;
          if (distanceArray) distanceArray[primaryIndex][i] = location.properties.travel_time;
        });
      }
    }
  });

  return {
    travelTimes: timeArray,
    distances: distanceArray,
    errors: responses.filter<BatchErrorResponse>((_) => _.type === 'error').map((_) => (_).error),
  };
}
