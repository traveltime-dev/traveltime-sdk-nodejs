import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('geocoding', () => {
  it('should geocode a query', async () => {
    const response = await client.geocoding('London', {
      params: { 'within.country': 'GB' },
    });
    expect(response.type).toBe('FeatureCollection');
    expect(response.features.length).toBeGreaterThan(0);
  });

  it('should reverse geocode coordinates', async () => {
    const response = await client.geocodingReverse({ lat: 51.508930, lng: -0.131387 });
    expect(response.type).toBe('FeatureCollection');
    expect(response.features.length).toBeGreaterThan(0);
  });
});
