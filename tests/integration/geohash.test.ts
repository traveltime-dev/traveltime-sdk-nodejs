import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('geohash', () => {
  it('should handle departure search', async () => {
    const response = await client.geohash({
      resolution: 5,
      properties: ['min', 'max', 'mean'],
      departure_searches: [{
        id: 'geohash departure',
        coords: { lat: 51.508930, lng: -0.131387 },
        departure_time: new Date().toISOString(),
        travel_time: 900,
        transportation: { type: 'driving' },
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].cells.length).toBeGreaterThan(0);
  });

  it('should handle arrival search', async () => {
    const response = await client.geohash({
      resolution: 5,
      properties: ['min', 'max', 'mean'],
      arrival_searches: [{
        id: 'geohash arrival',
        coords: { lat: 51.508930, lng: -0.131387 },
        arrival_time: new Date().toISOString(),
        travel_time: 900,
        transportation: { type: 'driving' },
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].cells.length).toBeGreaterThan(0);
  });

  it('should handle union', async () => {
    const response = await client.geohash({
      resolution: 4,
      properties: ['min', 'max', 'mean'],
      departure_searches: [
        {
          id: 'geohash departure 1',
          coords: { lat: 51.508930, lng: -0.131387 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        },
        {
          id: 'geohash departure 2',
          coords: { lat: 51.502337, lng: -0.174824 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        },
      ],
      unions: [{
        id: 'union',
        search_ids: ['geohash departure 1', 'geohash departure 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
