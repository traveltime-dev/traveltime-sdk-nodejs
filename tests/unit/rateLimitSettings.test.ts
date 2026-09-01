import { describe, it, expect } from 'vitest';
import { TravelTimeClient, TravelTimeProtoClient } from '../../src';

const credentials = { applicationId: 'app', apiKey: 'key' };

describe('setRateLimitSettings', () => {
  it('updates the rate limiter on TravelTimeClient', () => {
    const client = new TravelTimeClient(credentials);

    client.setRateLimitSettings({ enabled: true });

    expect((client as any).rateLimiter.isEnabled()).toBe(true);
  });

  it('updates the rate limiter on TravelTimeProtoClient', () => {
    const client = new TravelTimeProtoClient(credentials);

    client.setRateLimitSettings({ enabled: true });

    expect((client as any).rateLimiter.isEnabled()).toBe(true);
  });
});
