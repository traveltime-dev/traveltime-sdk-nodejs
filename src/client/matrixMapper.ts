import {
  BatchErrorResponse,
  BatchResponse,
  TimeFilterFastRequest,
  TimeFilterFastRequestProperty,
  TimeFilterFastResponse,

} from '../types';
import { TimeFilterFastManyToManyMatrixRequest, TimeFilterFastManyToManyMatrixResponse } from '../types/timeFilterMatrix';

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
