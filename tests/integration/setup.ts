import { TravelTimeClient, TravelTimeProtoClient, LocationRequest } from '../../src';

export const client = new TravelTimeClient({
  apiKey: process.env.API_KEY!,
  applicationId: process.env.APP_ID!,
});

export const protoClient = new TravelTimeProtoClient({
  apiKey: process.env.API_KEY!,
  applicationId: process.env.APP_ID!,
});

export const locations: LocationRequest[] = [
  { id: 'London center', coords: { lat: 51.508930, lng: -0.131387 } },
  { id: 'Hyde Park', coords: { lat: 51.502337, lng: -0.174824 } },
  { id: 'ZSL London Zoo', coords: { lat: 51.536067, lng: -0.153596 } },
];
