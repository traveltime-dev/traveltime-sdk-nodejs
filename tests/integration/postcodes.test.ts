import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('postcodes', () => {
  it('should handle timeFilterPostcodes', async () => {
    const response = await client.timeFilterPostcodes({
      departure_searches: [{
        id: 'postcodes search',
        coords: { lat: 51.508930, lng: -0.131387 },
        departure_time: new Date().toISOString(),
        travel_time: 1800,
        transportation: { type: 'public_transport' },
        properties: ['travel_time'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].postcodes.length).toBeGreaterThan(0);
  });

  it('should handle timeFilterPostcodeDistricts', async () => {
    const response = await client.timeFilterPostcodeDistricts({
      departure_searches: [{
        id: 'districts search',
        coords: { lat: 51.508930, lng: -0.131387 },
        departure_time: new Date().toISOString(),
        travel_time: 1800,
        transportation: { type: 'public_transport' },
        reachable_postcodes_threshold: 0.1,
        properties: ['travel_time_reachable', 'coverage'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].districts.length).toBeGreaterThan(0);
  });

  it('should handle timeFilterPostcodeSectors', async () => {
    const response = await client.timeFilterPostcodeSectors({
      departure_searches: [{
        id: 'sectors search',
        coords: { lat: 51.508930, lng: -0.131387 },
        departure_time: new Date().toISOString(),
        travel_time: 1800,
        transportation: { type: 'public_transport' },
        reachable_postcodes_threshold: 0.1,
        properties: ['travel_time_reachable', 'coverage'],
      }],
    });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].sectors.length).toBeGreaterThan(0);
  });
});
