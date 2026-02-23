import { describe, it, expect } from 'vitest';
import { protoClient } from './setup';
import { TimeFilterFastProtoResponse } from '../../src';

function hasProperties(response: TimeFilterFastProtoResponse): response is { properties: { travelTimes: number[] } } {
  return 'properties' in response;
}

function hasDistances(response: TimeFilterFastProtoResponse): response is { properties: { travelTimes: number[], distances: number[] } } {
  return 'properties' in response && 'distances' in (response as any).properties;
}

describe('timeFilterProto', () => {
  const departure = { lat: 51.508930, lng: -0.131387 };
  const destinations = [
    { lat: 51.502337, lng: -0.174824 },
    { lat: 51.536067, lng: -0.153596 },
  ];

  it('should handle public transport', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: 'pt',
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);
    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });

  it('should handle driving', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: 'driving+ferry',
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);

    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });

  it('should handle walking', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: 'walking+ferry',
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);
    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });

  it('should handle cycling', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: 'cycling+ferry',
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);
    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });

  it('should handle driving+pt', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: 'driving+pt',
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);
    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });

  it('should handle distance request with driving', async () => {
    const response = await protoClient.timeFilterFastDistance({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: 'driving+ferry',
      travelTime: 7200,
    });
    expect(hasDistances(response)).toBe(true);
    if (hasDistances(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
      expect(response.properties.distances.length).toBeGreaterThan(0);
    }
  });

  it('should handle pt with detailed transportation', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: { mode: 'pt', details: { walkingTimeToStation: 900 } },
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);
    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });

  it('should handle driving+pt with detailed transportation', async () => {
    const response = await protoClient.timeFilterFast({
      country: 'uk',
      departureLocation: departure,
      destinationCoordinates: destinations,
      transportation: {
        mode: 'driving+pt',
        details: {
          walkingTimeToStation: 900,
          drivingTimeToStation: 600,
          parkingTime: 300,
        },
      },
      travelTime: 7200,
    });
    expect(hasProperties(response)).toBe(true);
    if (hasProperties(response)) {
      expect(response.properties.travelTimes.length).toBeGreaterThan(0);
    }
  });
});
