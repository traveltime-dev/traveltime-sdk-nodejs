import { describe, it, expect } from 'vitest';
import { client, locations } from './setup';

describe('routes', () => {
  it('should handle departure search', async () => {
    const response = await client.routes({
      locations,
      departure_searches: [{
        id: 'departure search',
        departure_location_id: 'London center',
        arrival_location_ids: ['Hyde Park', 'ZSL London Zoo'],
        departure_time: new Date().toISOString(),
        transportation: { type: 'driving' },
        properties: ['travel_time', 'distance', 'route'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });

  it('should handle arrival search', async () => {
    const response = await client.routes({
      locations,
      arrival_searches: [{
        id: 'arrival search',
        arrival_location_id: 'London center',
        departure_location_ids: ['Hyde Park', 'ZSL London Zoo'],
        arrival_time: new Date().toISOString(),
        transportation: { type: 'driving' },
        properties: ['travel_time', 'distance', 'route'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
