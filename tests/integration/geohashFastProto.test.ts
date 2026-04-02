import { describe, it, expect } from 'vitest';
import { protoClient } from './setup';
import { GeohashFastProtoResponse } from '../../src';

function hasCells(response: GeohashFastProtoResponse): response is { cells: { ids: string[], minTravelTimes?: number[], maxTravelTimes?: number[], meanTravelTimes?: number[] } } {
  return 'cells' in response;
}

describe('geohashFastProto', () => {
  const departure = { lat: 51.508930, lng: -0.131387 };

  it('should handle oneToMany with driving', async () => {
    const response = await protoClient.geohashFast({
      country: 'uk',
      departureLocation: departure,
      transportation: 'driving+ferry',
      travelTime: 1800,
      resolution: 6,
      properties: ['min', 'max', 'mean'],
    });
    expect(hasCells(response)).toBe(true);
    if (hasCells(response)) {
      expect(response.cells.ids.length).toBeGreaterThan(0);
    }
  });

  it('should handle manyToOne with driving', async () => {
    const response = await protoClient.geohashFast({
      country: 'uk',
      arrivalLocation: departure,
      transportation: 'driving+ferry',
      travelTime: 1800,
      resolution: 6,
      properties: ['min', 'max', 'mean'],
    });
    expect(hasCells(response)).toBe(true);
    if (hasCells(response)) {
      expect(response.cells.ids.length).toBeGreaterThan(0);
    }
  });

  it('should handle public transport', async () => {
    const response = await protoClient.geohashFast({
      country: 'uk',
      departureLocation: departure,
      transportation: 'pt',
      travelTime: 1800,
      resolution: 6,
      properties: ['mean'],
    });
    expect(hasCells(response)).toBe(true);
    if (hasCells(response)) {
      expect(response.cells.ids.length).toBeGreaterThan(0);
    }
  });
});
