import { describe, it, expect } from 'vitest';
import { client, locations } from './setup';

describe('timeFilterFast', () => {
  it('should handle one-to-many search', async () => {
    const response = await client.timeFilterFast({
      locations,
      arrival_searches: {
        one_to_many: [{
          id: 'one-to-many search',
          departure_location_id: 'London center',
          arrival_location_ids: ['Hyde Park', 'ZSL London Zoo'],
          arrival_time_period: 'weekday_morning',
          travel_time: 3600,
          transportation: { type: 'public_transport' },
          properties: ['travel_time'],
        }],
      },
    });
    expect(response.results.length).toBeGreaterThan(0);
  });

  it('should handle many-to-one search', async () => {
    const response = await client.timeFilterFast({
      locations,
      arrival_searches: {
        many_to_one: [{
          id: 'many-to-one search',
          arrival_location_id: 'London center',
          departure_location_ids: ['Hyde Park', 'ZSL London Zoo'],
          arrival_time_period: 'weekday_morning',
          travel_time: 3600,
          transportation: { type: 'public_transport' },
          properties: ['travel_time'],
        }],
      },
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
