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

function validateMaxSearchLimit(MAX_SEARCHES_LIMIT: number, maxSearchesPerRequest: number | undefined) {
  const maxSearches = maxSearchesPerRequest || MAX_SEARCHES_LIMIT;
  if (maxSearches > MAX_SEARCHES_LIMIT) {
    throw new Error(`Max number of searches is ${MAX_SEARCHES_LIMIT}`);
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
  coordsFrom: Coords[]
  coordsTo: Coords[]
}, makeRequest: (params: {
  indexFrom: number,
  coordsFrom: Coords,
  chunk: Coords[],
  chunkOffset: number,
}) => R): R[] {
  const maxSearchesPerRequest = validateMaxSearchLimit(100_000, body.maxSearchesPerRequest);
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
  return generateRequestsFromChunks<TimeFilterFastRequest>({
    coordsFrom: body.coordsFrom,
    coordsTo: body.coordsTo,
    maxSearchesPerRequest: body.maxSearchesPerRequest,
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
          if (distanceArray) distanceArray[primaryIndex][i] = location.properties.travel_time;
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
  return generateRequestsFromChunks<TimeFilterRequest>({
    coordsFrom: body.coordsFrom,
    coordsTo: body.coordsTo,
    maxSearchesPerRequest: body.maxSearchesPerRequest,
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
          if (distanceArray) distanceArray[primaryIndex][i] = location.properties[0].travel_time;
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
