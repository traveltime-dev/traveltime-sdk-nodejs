import {
  describe, it, expect, vi,
} from 'vitest';
import { TravelTimeProtoClient, TimeFilterFastProtoCountry } from '../../src';

const EMPTY_RESPONSE = Buffer.alloc(0);

function stubbedClient(baseUrl?: string) {
  const client = new TravelTimeProtoClient({ applicationId: 'app', apiKey: 'key' }, { baseUrl });
  const post = vi.spyOn((client as any).axiosInstance, 'post').mockResolvedValue({ data: EMPTY_RESPONSE });
  return { client, post };
}

const departureLocation = { lat: 51.5, lng: -0.13 };

describe('TravelTimeProtoClient request path', () => {
  it('lowercases the country in time filter paths, leaving the base URL as given', async () => {
    const { client, post } = stubbedClient('http://proxy.example/API/v3');

    await client.timeFilterFast({
      country: 'US' as TimeFilterFastProtoCountry,
      departureLocation,
      destinationCoordinates: [{ lat: 51.51, lng: -0.14 }],
      transportation: 'driving',
      travelTime: 900,
    });

    expect(post.mock.calls[0][0]).toBe('http://proxy.example/API/v3/us/time-filter/fast/driving');
  });

  it('lowercases the country in geohash paths', async () => {
    const { client, post } = stubbedClient();

    await client.geohashFast({
      country: 'US' as TimeFilterFastProtoCountry,
      departureLocation,
      transportation: 'driving',
      travelTime: 900,
      resolution: 6,
    });

    expect(post.mock.calls[0][0]).toBe('http://proto.api.traveltimeapp.com/api/v3/us/geohash/fast/driving');
  });
});
