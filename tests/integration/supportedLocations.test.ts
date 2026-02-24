import { describe, it, expect } from 'vitest';
import { client, locations } from './setup';

describe('supportedLocations', () => {
  it('should return supported locations', async () => {
    const response = await client.supportedLocations({
      locations: locations.map((loc) => ({ id: loc.id, coords: loc.coords })),
    });
    expect(response.locations.length).toBeGreaterThan(0);
  });
});
