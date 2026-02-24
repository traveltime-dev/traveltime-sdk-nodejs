import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('h3Fast', () => {
  it('should handle one-to-many search', async () => {
    const response = await client.h3Fast({
      resolution: 6,
      properties: ['min', 'max', 'mean'],
      arrival_searches: {
        one_to_many: [{
          id: 'h3 fast one-to-many',
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
    const response = await client.h3Fast({
      resolution: 6,
      properties: ['min', 'max', 'mean'],
      arrival_searches: {
        many_to_one: [{
          id: 'h3 fast many-to-one',
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
    const response = await client.h3Fast({
      resolution: 5,
      properties: ['min', 'max', 'mean'],
      arrival_searches: {
        one_to_many: [
          {
            id: 'h3 fast 1',
            coords: { lat: 51.508930, lng: -0.131387 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
          {
            id: 'h3 fast 2',
            coords: { lat: 51.502337, lng: -0.174824 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
        ],
      },
      unions: [{
        id: 'union',
        search_ids: ['h3 fast 1', 'h3 fast 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
