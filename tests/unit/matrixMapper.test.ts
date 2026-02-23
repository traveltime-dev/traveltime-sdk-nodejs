import { describe, it, expect } from 'vitest';
import {
  timeFilterManyToManyMatrixToRequest,
  timeFilterFastManyToManyMatrixToRequest,
  timeFilterManyToManyMatrixResponseMapper,
  timeFilterFastManyToManyMatrixResponseMapper,
} from '../../src/client/matrixMapper';
import { BatchResponse, TimeFilterResponse, TimeFilterFastResponse } from '../../src';

describe('matrixMapper', () => {
  const coordsFrom = [
    { lat: 51.5087, lng: -0.1313 },
    { lat: 51.5024, lng: -0.1748 },
  ];
  const coordsTo = [
    { lat: 51.5361, lng: -0.1536 },
    { lat: 51.5200, lng: -0.1000 },
    { lat: 51.4900, lng: -0.1400 },
  ];

  describe('timeFilterManyToManyMatrixToRequest', () => {
    it('should generate correct number of requests for depart search', () => {
      const requests = timeFilterManyToManyMatrixToRequest({
        coordsFrom,
        coordsTo,
        travelTime: 3600,
        transportation: { type: 'driving' },
        leaveTime: '2024-01-01T08:00:00Z',
        searchType: 'depart',
      });

      expect(requests.length).toBe(2);
      expect(requests[0].departure_searches).toBeDefined();
      expect(requests[0].departure_searches!.length).toBe(1);
      expect(requests[0].departure_searches![0].departure_location_id).toBe('from-0');
      expect(requests[0].departure_searches![0].arrival_location_ids).toEqual(['to-0', 'to-1', 'to-2']);
    });

    it('should generate correct number of requests for arrive search', () => {
      const requests = timeFilterManyToManyMatrixToRequest({
        coordsFrom,
        coordsTo,
        travelTime: 3600,
        transportation: { type: 'driving' },
        leaveTime: '2024-01-01T08:00:00Z',
        searchType: 'arrive',
      });

      expect(requests.length).toBe(2);
      expect(requests[0].arrival_searches).toBeDefined();
      expect(requests[0].arrival_searches!.length).toBe(1);
      expect(requests[0].arrival_searches![0].arrival_location_id).toBe('from-0');
      expect(requests[0].arrival_searches![0].departure_location_ids).toEqual(['to-0', 'to-1', 'to-2']);
    });

    it('should generate correct locations', () => {
      const requests = timeFilterManyToManyMatrixToRequest({
        coordsFrom,
        coordsTo,
        travelTime: 3600,
        transportation: { type: 'driving' },
        leaveTime: '2024-01-01T08:00:00Z',
        searchType: 'depart',
      });

      expect(requests[0].locations.length).toBe(4);
      expect(requests[0].locations[0].id).toBe('from-0');
      expect(requests[0].locations[0].coords).toEqual(coordsFrom[0]);
      expect(requests[0].locations[1].id).toBe('to-0');
      expect(requests[0].locations[1].coords).toEqual(coordsTo[0]);
    });

    it('should chunk when maxSearchesPerRequest is set', () => {
      const requests = timeFilterManyToManyMatrixToRequest({
        coordsFrom: [coordsFrom[0]],
        coordsTo,
        travelTime: 3600,
        transportation: { type: 'driving' },
        leaveTime: '2024-01-01T08:00:00Z',
        searchType: 'depart',
        maxSearchesPerRequest: 2,
      });

      expect(requests.length).toBe(2);
      expect(requests[0].departure_searches![0].arrival_location_ids.length).toBe(2);
      expect(requests[1].departure_searches![0].arrival_location_ids.length).toBe(1);
    });
  });

  describe('timeFilterFastManyToManyMatrixToRequest', () => {
    it('should generate correct requests', () => {
      const requests = timeFilterFastManyToManyMatrixToRequest({
        coordsFrom,
        coordsTo,
        travelTime: 3600,
        transportation: { type: 'driving' },
      });

      expect(requests.length).toBe(2);
      expect(requests[0].arrival_searches.one_to_many).toBeDefined();
      expect(requests[0].arrival_searches.one_to_many!.length).toBe(1);
      expect(requests[0].arrival_searches.one_to_many![0].departure_location_id).toBe('from-0');
      expect(requests[0].arrival_searches.one_to_many![0].arrival_location_ids).toEqual(['to-0', 'to-1', 'to-2']);
    });

    it('should set arrival_time_period to weekday_morning', () => {
      const requests = timeFilterFastManyToManyMatrixToRequest({
        coordsFrom: [coordsFrom[0]],
        coordsTo,
        travelTime: 3600,
        transportation: { type: 'driving' },
      });

      expect(requests[0].arrival_searches.one_to_many![0].arrival_time_period).toBe('weekday_morning');
    });
  });

  describe('timeFilterManyToManyMatrixResponseMapper', () => {
    it('should map successful responses into a travel time matrix', () => {
      const responses: BatchResponse<TimeFilterResponse>[] = [
        {
          type: 'success',
          body: {
            results: [{
              search_id: 'from-0-chunk-0',
              locations: [
                { id: 'to-0', properties: [{ travel_time: 600 }] },
                { id: 'to-1', properties: [{ travel_time: 900 }] },
              ],
              unreachable: ['to-2'],
            }],
          },
        },
        {
          type: 'success',
          body: {
            results: [{
              search_id: 'from-1-chunk-0',
              locations: [
                { id: 'to-0', properties: [{ travel_time: 1200 }] },
              ],
              unreachable: ['to-1', 'to-2'],
            }],
          },
        },
      ];

      const result = timeFilterManyToManyMatrixResponseMapper(responses, 2, 3, ['travel_time']);

      expect(result.travelTimes).toBeDefined();
      expect(result.travelTimes![0][0]).toBe(600);
      expect(result.travelTimes![0][1]).toBe(900);
      expect(result.travelTimes![0][2]).toBe(-1);
      expect(result.travelTimes![1][0]).toBe(1200);
      expect(result.travelTimes![1][1]).toBe(-1);
      expect(result.travelTimes![1][2]).toBe(-1);
      expect(result.errors.length).toBe(0);
    });

    it('should handle error responses', () => {
      const responses: BatchResponse<TimeFilterResponse>[] = [
        {
          type: 'error',
          error: new Error('API error'),
        },
      ];

      const result = timeFilterManyToManyMatrixResponseMapper(responses, 1, 3, ['travel_time']);
      expect(result.errors.length).toBe(1);
      expect(result.travelTimes![0]).toEqual([null, null, null]);
    });

    it('should not include travelTimes when not in properties', () => {
      const responses: BatchResponse<TimeFilterResponse>[] = [];
      const result = timeFilterManyToManyMatrixResponseMapper(responses, 1, 1, ['distance']);
      expect(result.travelTimes).toBeUndefined();
      expect(result.distances).toBeDefined();
    });
  });

  describe('timeFilterFastManyToManyMatrixResponseMapper', () => {
    it('should map successful responses into a travel time matrix', () => {
      const responses: BatchResponse<TimeFilterFastResponse>[] = [
        {
          type: 'success',
          body: {
            results: [{
              search_id: 'from-0-chunk-0',
              locations: [
                { id: 'to-0', properties: { travel_time: 600 } },
                { id: 'to-1', properties: { travel_time: 900 } },
              ],
              unreachable: ['to-2'],
            }],
          },
        },
      ];

      const result = timeFilterFastManyToManyMatrixResponseMapper(responses, 1, 3, ['travel_time']);

      expect(result.travelTimes).toBeDefined();
      expect(result.travelTimes![0][0]).toBe(600);
      expect(result.travelTimes![0][1]).toBe(900);
      expect(result.travelTimes![0][2]).toBe(-1);
      expect(result.errors.length).toBe(0);
    });

    it('should handle distance property', () => {
      const responses: BatchResponse<TimeFilterFastResponse>[] = [
        {
          type: 'success',
          body: {
            results: [{
              search_id: 'from-0-chunk-0',
              locations: [
                { id: 'to-0', properties: { travel_time: 600, distance: 5000 } },
              ],
              unreachable: [],
            }],
          },
        },
      ];

      const result = timeFilterFastManyToManyMatrixResponseMapper(responses, 1, 1, ['travel_time', 'distance']);
      expect(result.travelTimes![0][0]).toBe(600);
      expect(result.distances![0][0]).toBe(5000);
    });
  });
});
