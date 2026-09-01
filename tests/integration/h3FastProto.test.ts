import { describe, it, expect } from 'vitest';
import { protoClient } from './setup';
import { H3FastProtoResponse } from '../../src';

function hasCells(response: H3FastProtoResponse): response is { cells: { ids: string[], minTravelTimes?: number[], maxTravelTimes?: number[], meanTravelTimes?: number[] } } {
  return 'cells' in response;
}

describe('h3FastProto', () => {
  const departure = { lat: 51.508930, lng: -0.131387 };

  it('should handle oneToMany with driving', async () => {
    const response = await protoClient.h3Fast({
      country: 'uk',
      departureLocation: departure,
      transportation: 'driving+ferry',
      travelTime: 1800,
      resolution: 7,
      properties: ['min', 'max', 'mean'],
    });
    expect(hasCells(response)).toBe(true);
    if (hasCells(response)) {
      expect(response.cells.ids.length).toBeGreaterThan(0);
      response.cells.ids.forEach((id) => expect(id).toMatch(/^8[0-9a-f]{14}$/));
    }
  });

  it('should handle manyToOne with driving', async () => {
    const response = await protoClient.h3Fast({
      country: 'uk',
      arrivalLocation: departure,
      transportation: 'driving+ferry',
      travelTime: 1800,
      resolution: 7,
      properties: ['min', 'max', 'mean'],
    });
    expect(hasCells(response)).toBe(true);
    if (hasCells(response)) {
      expect(response.cells.ids.length).toBeGreaterThan(0);
    }
  });

  it('should handle public transport', async () => {
    const response = await protoClient.h3Fast({
      country: 'uk',
      departureLocation: departure,
      transportation: 'pt',
      travelTime: 1800,
      resolution: 7,
      properties: ['mean'],
    });
    expect(hasCells(response)).toBe(true);
    if (hasCells(response)) {
      expect(response.cells.ids.length).toBeGreaterThan(0);
    }
  });

  it('should handle remove_water_bodies', async () => {
    const cells = async (removeWaterBodies: boolean) => {
      const response = await protoClient.h3Fast({
        country: 'uk',
        departureLocation: { lat: 51.508, lng: -0.087 },
        transportation: 'driving+ferry',
        travelTime: 1800,
        resolution: 9,
        properties: ['min'],
        removeWaterBodies,
      });
      return hasCells(response) ? response.cells.ids.length : 0;
    };
    expect(await cells(false)).toBeGreaterThan(await cells(true));
  }, 30000);
});
