import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('timeMapFast', () => {
  it('should handle one-to-many search', async () => {
    const response = await client.timeMapFast({
      arrival_searches: {
        one_to_many: [{
          id: 'one-to-many search',
          coords: { lat: 51.508930, lng: -0.131387 },
          arrival_time_period: 'weekday_morning',
          travel_time: 900,
          transportation: { type: 'public_transport' },
        }],
      },
    });
    expect(response.results.length).toBeGreaterThan(0);
  });

  it('should handle many-to-one search', async () => {
    const response = await client.timeMapFast({
      arrival_searches: {
        many_to_one: [{
          id: 'many-to-one search',
          coords: { lat: 51.508930, lng: -0.131387 },
          arrival_time_period: 'weekday_morning',
          travel_time: 900,
          transportation: { type: 'public_transport' },
        }],
      },
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
