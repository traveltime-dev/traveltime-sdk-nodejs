import { describe, it, expect } from 'vitest';
import { TravelTimeClient, TravelTimeError } from '../../src';

describe('errors', () => {
  it('should return 422 for invalid request body', async () => {
    const validClient = new TravelTimeClient({
      apiKey: process.env.API_KEY!,
      applicationId: process.env.APP_ID!,
    });

    try {
      await validClient.timeMap({
        departure_searches: [{
          id: 'invalid search',
          coords: { lat: 40.0, lng: -30.0 },
          departure_time: new Date().toISOString(),
          travel_time: 900,
          transportation: { type: 'driving' },
        }],
      });
      expect.fail('Expected error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TravelTimeError);
      expect((error as TravelTimeError).http_status).toBe(422);
    }
  });
});
