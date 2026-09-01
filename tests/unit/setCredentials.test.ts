import { describe, it, expect } from 'vitest';
import { TravelTimeClient, TravelTimeProtoClient } from '../../src';

const credentials = { applicationId: 'app', apiKey: 'key' };
const newCredentials = { applicationId: 'new-app', apiKey: 'new-key' };

describe('setCredentials', () => {
  it('updates the request headers on TravelTimeClient', () => {
    const client = new TravelTimeClient(credentials);

    client.setCredentials(newCredentials);

    const headers = (client as any).axiosInstance.defaults.headers.common;
    expect(headers['X-Application-Id']).toBe('new-app');
    expect(headers['X-Api-Key']).toBe('new-key');
  });

  it('updates the basic auth on TravelTimeProtoClient', () => {
    const client = new TravelTimeProtoClient(credentials);

    client.setCredentials(newCredentials);

    expect((client as any).axiosInstance.defaults.auth).toEqual({ username: 'new-app', password: 'new-key' });
  });

  it('rejects empty credentials', () => {
    const client = new TravelTimeClient(credentials);

    expect(() => client.setCredentials({ applicationId: '', apiKey: 'x' })).toThrow('Credentials must be valid');
  });
});
