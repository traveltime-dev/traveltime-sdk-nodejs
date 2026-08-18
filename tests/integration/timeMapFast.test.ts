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

  it('should handle union', async () => {
    const response = await client.timeMapFast({
      arrival_searches: {
        one_to_many: [
          {
            id: 'time map fast 1',
            coords: { lat: 51.508930, lng: -0.131387 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
          {
            id: 'time map fast 2',
            coords: { lat: 51.502337, lng: -0.174824 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
        ],
      },
      unions: [{
        id: 'union',
        search_ids: ['time map fast 1', 'time map fast 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });

  it('should handle intersection', async () => {
    const response = await client.timeMapFast({
      arrival_searches: {
        one_to_many: [
          {
            id: 'time map fast 1',
            coords: { lat: 51.508930, lng: -0.131387 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
          {
            id: 'time map fast 2',
            coords: { lat: 51.502337, lng: -0.174824 },
            arrival_time_period: 'weekday_morning',
            travel_time: 900,
            transportation: { type: 'driving' },
          },
        ],
      },
      intersections: [{
        id: 'intersection',
        search_ids: ['time map fast 1', 'time map fast 2'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
  });
});
