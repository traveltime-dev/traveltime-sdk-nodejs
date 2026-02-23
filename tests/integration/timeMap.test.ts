import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('timeMap', () => {
  it('should handle departure search', async () => {
    const response = await client.timeMap({
      departure_searches: [{
        id: 'departure search',
        coords: { lat: 51.508930, lng: -0.131387 },
        departure_time: new Date().toISOString(),
        travel_time: 900,
        transportation: { type: 'driving' },
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].shapes.length).toBeGreaterThan(0);
  });

  it('should handle arrival search', async () => {
    const response = await client.timeMap({
      arrival_searches: [{
        id: 'arrival search',
        coords: { lat: 51.508930, lng: -0.131387 },
        arrival_time: new Date().toISOString(),
        travel_time: 900,
        transportation: { type: 'driving' },
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].shapes.length).toBeGreaterThan(0);
  });

  it('should handle union', async () => {
    const response = await client.timeMap({
      departure_searches: [
        {
          id: 'departure search 1',
          coords: { lat: 51.508930, lng: -0.131387 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        },
        {
          id: 'departure search 2',
          coords: { lat: 51.502337, lng: -0.174824 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        },
      ],
      unions: [{
        id: 'union',
        search_ids: ['departure search 1', 'departure search 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });

  it('should handle intersection', async () => {
    const response = await client.timeMap({
      departure_searches: [
        {
          id: 'departure search 1',
          coords: { lat: 51.508930, lng: -0.131387 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        },
        {
          id: 'departure search 2',
          coords: { lat: 51.502337, lng: -0.174824 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        },
      ],
      intersections: [{
        id: 'intersection',
        search_ids: ['departure search 1', 'departure search 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
