import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('distanceMap', () => {
  it('should handle departure search', async () => {
    const response = await client.distanceMap({
      departure_searches: [{
        id: 'distance map departure',
        coords: { lat: 51.508930, lng: -0.131387 },
        departure_time: new Date().toISOString(),
        travel_distance: 900,
        transportation: { type: 'driving' },
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].shapes.length).toBeGreaterThan(0);
  });

  it('should handle arrival search', async () => {
    const response = await client.distanceMap({
      arrival_searches: [{
        id: 'distance map arrival',
        coords: { lat: 51.508930, lng: -0.131387 },
        arrival_time: new Date().toISOString(),
        travel_distance: 900,
        transportation: { type: 'driving' },
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].shapes.length).toBeGreaterThan(0);
  });
});
