import { describe, it, expect } from 'vitest';
import { client } from './setup';

describe('mapInfo', () => {
  it('should return map info', async () => {
    const response = await client.mapInfo();
    expect(response.maps.length).toBeGreaterThan(0);
  });
});
