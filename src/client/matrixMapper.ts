import {
  BatchErrorResponse,
  BatchResponse,
  Coords,
  LocationRequest,
  TimeFilterFastRequest,
  TimeFilterFastRequestProperty,
  TimeFilterFastResponse,
  TimeFilterRequest,
  TimeFilterRequestProperty,
  TimeFilterResponse,
} from '../types';
import {
  TimeFilterFastManyToManyMatrixRequest, TimeFilterFastManyToManyMatrixResponse, TimeFilterManyToManyMatrixRequest, TimeFilterManyToManyMatrixResponse,
} from '../types/timeFilterMatrix';
import { TravelTimeValidationError } from '../error';

function validateMatrixRequest(body: { coordsFrom?: Coords[], coordsTo?: Coords[] } | undefined) {
  if (!body || typeof body !== 'object') {
    throw new TravelTimeValidationError('Request body must be an object');
  }
  if (!Array.isArray(body.coordsFrom)) {
    throw new TravelTimeValidationError('coordsFrom must be an array of coordinates');
  }
  if (!Array.isArray(body.coordsTo)) {
    throw new TravelTimeValidationError('coordsTo must be an array of coordinates');
  }
}

const MAX_SEARCHES_LIMIT = 100_000;
/** Time Filter's per-search location limit on most plans; larger requests are rejected unless the plan allows more. */
const TIME_FILTER_DEFAULT_MAX_SEARCHES = 2_000;

function validateMaxSearchLimit(maxSearchesPerRequest: number | undefined, defaultMaxSearches: number) {
  const maxSearches = maxSearchesPerRequest || defaultMaxSearches;
  if (maxSearches > MAX_SEARCHES_LIMIT) {
    throw new TravelTimeValidationError(`Max number of searches is ${MAX_SEARCHES_LIMIT}`);
  }
  return maxSearches;
}

function generateLocationsForChunk(indexFrom: number, coordsFrom: Coords, chunk: Coords[], chunkOffset: number): LocationRequest[] {
  return [
    { id: `from-${indexFrom}`, coords: coordsFrom },
    ...chunk.map((coordsTo, iTo) => ({ id: `to-${iTo + chunkOffset}`, coords: coordsTo })),
  ];
}

function generateRequestsFromChunks<R>(body: {
  maxSearchesPerRequest: number | undefined
  defaultMaxSearchesPerRequest: number
  coordsFrom: Coords[]
  coordsTo: Coords[]
}, makeRequest: (params: {
  indexFrom: number,
  coordsFrom: Coords,
  chunk: Coords[],
  chunkOffset: number,
}) => R): R[] {
  const maxSearchesPerRequest = validateMaxSearchLimit(body.maxSearchesPerRequest, body.defaultMaxSearchesPerRequest);
  const requests: R[] = [];
  body.coordsFrom.forEach((coordsFrom, indexFrom) => {
    for (let index = 0; index < body.coordsTo.length; index += maxSearchesPerRequest) {
      const chunk = body.coordsTo.slice(index, index + maxSearchesPerRequest);
      requests.push(makeRequest({
        indexFrom, coordsFrom, chunk, chunkOffset: index,
      }));
    }
  });
  return requests;
}

const parseSingleIdToNumber = (locationId: string) => Number.parseInt(locationId.substring(3), 10);

function getPrimaryIndex(searchId: string) {
  const rgx = /.*-(\d+)-.*(\d+)/;
  const rgxMatch = rgx.exec(searchId);
  if (rgxMatch) {
    const primaryIndex = Number.parseInt(rgxMatch[1], 10);
    if (!Number.isNaN(primaryIndex)) return primaryIndex;
  }

  return -1;
}

const generateSearchId = (indexFrom: number, chunkOffset: number) => `from-${indexFrom}-chunk-${chunkOffset}`;
const generateFromId = (indexFrom: number) => `from-${indexFrom}`;
const generateToIds = (chunk: Coords[], chunkOffset: number) => chunk.map((_, iTo) => `to-${iTo + chunkOffset}`);

export function timeFilterFastManyToManyMatrixToRequest(body: TimeFilterFastManyToManyMatrixRequest): TimeFilterFastRequest[] {
  validateMatrixRequest(body);
  return generateRequestsFromChunks<TimeFilterFastRequest>({
    coordsFrom: body.coordsFrom,
    coordsTo: body.coordsTo,
    maxSearchesPerRequest: body.maxSearchesPerRequest,
    defaultMaxSearchesPerRequest: MAX_SEARCHES_LIMIT,
  }, ({
    indexFrom, coordsFrom, chunk, chunkOffset,
  }) => ({
    locations: generateLocationsForChunk(indexFrom, coordsFrom, chunk, chunkOffset),
    arrival_searches: {
      one_to_many: [{
        id: generateSearchId(indexFrom, chunkOffset),
        departure_location_id: generateFromId(indexFrom),
        arrival_location_ids: generateToIds(chunk, chunkOffset),
        arrival_time_period: 'weekday_morning',
        properties: body.properties || ['travel_time'],
        transportation: body.transportation,
        travel_time: body.travelTime,
      }],
    },
  }));
}

export function timeFilterFastManyToManyMatrixResponseMapper(responses: BatchResponse<TimeFilterFastResponse>[], sizeFrom: number, sizeTo: number, properties: TimeFilterFastRequestProperty[]): TimeFilterFastManyToManyMatrixResponse {
  const timeArray = properties.includes('travel_time') ? Array.from({ length: sizeFrom }, () => Array<null | number>(sizeTo).fill(null)) : undefined;
  const distanceArray = properties.includes('distance') ? Array.from({ length: sizeFrom }, () => Array<null | number>(sizeTo).fill(null)) : undefined;
  responses.forEach((response) => {
    if (response.type === 'success') {
      const resp = response.body.results[0];
      const primaryIndex = getPrimaryIndex(resp.search_id);
      if (primaryIndex !== -1) {
        const unreachableIndexes = resp.unreachable.map(parseSingleIdToNumber);
        unreachableIndexes.forEach((i) => {
          if (timeArray) timeArray[primaryIndex][i] = -1;
          if (distanceArray) distanceArray[primaryIndex][i] = -1;
        });
        resp.locations.forEach((location) => {
          const i = parseSingleIdToNumber(location.id);
          if (timeArray) timeArray[primaryIndex][i] = location.properties.travel_time;
          if (distanceArray) distanceArray[primaryIndex][i] = location.properties.distance ?? -1;
        });
      }
    }
  });

  return {
    travelTimes: timeArray,
    distances: distanceArray,
    errors: responses.filter<BatchErrorResponse>((_): _ is BatchErrorResponse => _.type === 'error').map((_) => (_).error),
  };
}

export function timeFilterManyToManyMatrixToRequest(body: TimeFilterManyToManyMatrixRequest): TimeFilterRequest[] {
  validateMatrixRequest(body);
  return generateRequestsFromChunks<TimeFilterRequest>({
    coordsFrom: body.coordsFrom,
    coordsTo: body.coordsTo,
    maxSearchesPerRequest: body.maxSearchesPerRequest,
    defaultMaxSearchesPerRequest: TIME_FILTER_DEFAULT_MAX_SEARCHES,
  }, ({
    indexFrom, coordsFrom, chunk, chunkOffset,
  }) => ({
    locations: generateLocationsForChunk(indexFrom, coordsFrom, chunk, chunkOffset),
    ...(body.searchType === 'depart' ? {
      departure_searches: [{
        id: generateSearchId(indexFrom, chunkOffset),
        arrival_location_ids: generateToIds(chunk, chunkOffset),
        departure_location_id: generateFromId(indexFrom),
        departure_time: body.leaveTime,
        properties: body.properties || ['travel_time'],
        transportation: body.transportation,
        travel_time: body.travelTime,
        snapping: body.snapping,
      }],
    } : {
      arrival_searches: [{
        id: generateSearchId(indexFrom, chunkOffset),
        departure_location_ids: generateToIds(chunk, chunkOffset),
        arrival_location_id: generateFromId(indexFrom),
        arrival_time: body.leaveTime,
        properties: body.properties || ['travel_time'],
        transportation: body.transportation,
        travel_time: body.travelTime,
        snapping: body.snapping,
      }],
    }),
  }));
}

export function timeFilterManyToManyMatrixResponseMapper(responses: BatchResponse<TimeFilterResponse>[], sizeFrom: number, sizeTo: number, properties: TimeFilterRequestProperty[]): TimeFilterManyToManyMatrixResponse {
  const timeArray = properties.includes('travel_time') ? Array.from({ length: sizeFrom }, () => Array<null | number>(sizeTo).fill(null)) : undefined;
  const distanceArray = properties.includes('distance') ? Array.from({ length: sizeFrom }, () => Array<null | number>(sizeTo).fill(null)) : undefined;
  responses.forEach((response) => {
    if (response.type === 'success') {
      const resp = response.body.results[0];
      const primaryIndex = getPrimaryIndex(resp.search_id);
      if (primaryIndex !== -1) {
        const unreachableIndexes = resp.unreachable.map(parseSingleIdToNumber);
        unreachableIndexes.forEach((i) => {
          if (timeArray) timeArray[primaryIndex][i] = -1;
          if (distanceArray) distanceArray[primaryIndex][i] = -1;
        });
        resp.locations.forEach((location) => {
          const i = parseSingleIdToNumber(location.id);
          if (timeArray) timeArray[primaryIndex][i] = location.properties[0].travel_time;
          if (distanceArray) distanceArray[primaryIndex][i] = location.properties[0].distance ?? -1;
        });
      }
    }
  });

  return {
    travelTimes: timeArray,
    distances: distanceArray,
    errors: responses.filter<BatchErrorResponse>((_): _ is BatchErrorResponse => _.type === 'error').map((_) => (_).error),
  };
}
