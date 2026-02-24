import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('geohashFast', () => {
  it('should handle one-to-many search', async () => {
    const response = await client.geohashFast({
      resolution: 5,
      properties: ['min', 'max', 'mean'],
      arrival_searches: {
        one_to_many: [{
          id: 'geohash fast one-to-many',
          coords: { lat: 51.508930, lng: -0.131387 },
          arrival_time_period: 'weekday_morning',
          travel_time: 900,
          transportation: { type: 'driving' },
        }],
      },
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].cells.length).toBeGreaterThan(0);
  });

  it('should handle many-to-one search', async () => {
    const response = await client.geohashFast({
      resolution: 5,
      properties: ['min', 'max', 'mean'],
      arrival_searches: {
        many_to_one: [{
          id: 'geohash fast many-to-one',
          coords: { lat: 51.508930, lng: -0.131387 },
          arrival_time_period: 'weekday_morning',
          travel_time: 900,
          transportation: { type: 'driving' },
        }],
      },
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].cells.length).toBeGreaterThan(0);
  });

  it('should handle union', async () => {
    const response = await client.geohashFast({
      resolution: 4,
      properties: ['min', 'max', 'mean'],
      arrival_searches: {
        one_to_many: [
          {
            id: 'geohash fast 1',
            coords: { lat: 51.508930, lng: -0.131387 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
          {
            id: 'geohash fast 2',
            coords: { lat: 51.502337, lng: -0.174824 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
        ],
      },
      unions: [{
        id: 'union',
        search_ids: ['geohash fast 1', 'geohash fast 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
