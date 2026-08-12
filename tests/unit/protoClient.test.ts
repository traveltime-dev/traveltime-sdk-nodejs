import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import { TravelTimeProtoClient, TravelTimeValidationError } from '../../src';
import { TimeFilterFastProtoCountry } from '../../src/types/proto';

/** The transport reads the global `fetch` at call time, so tests stub it. */
type FakeFetch = (url: string, init: RequestInit) => Promise<Response>;

type RecordedCall = { url: string; init: RequestInit };

/** A fake fetch that records calls and always replays the given response. */
function recordingFetch(response: () => Response) {
  const calls: RecordedCall[] = [];
  const fn: FakeFetch = async (url, init) => {
    calls.push({ url, init });
    return response();
  };
  return { calls, fn };
}

/**
 * Wire-format fixtures, hex-encoded. Generated with protobufjs' reflection
 * path (`protobuf.loadSync` over `src/client/proto/v2`), which is how v7
 * encoded requests and decoded responses — so these lock v8 to the exact v7
 * wire behaviour.
 */
const TF_RES_POPULATED = '120c0a04b00900011a046400fa01'; // { properties: { travelTimes: [600, 0, -1], distances: [100, 0, 250] } }
const TF_RES_EMPTY_PROPERTIES = '1200'; // { properties: {} } — all repeated fields empty
const TF_RES_ERROR_TOO_MANY_REQUESTS = '0a020810'; // { error: { type: 16 } }
const TF_RES_ERROR_UNKNOWN = '0a00'; // { error: { type: 0 } } — zero enum value is absent from the wire
const GH_RES_POPULATED = '0a130a0567627375760a0567627375772203d80454'; // { cells: { ids: [gbsuv, gbsuw], meanTravelTimes: [300, 42] } }
const GH_RES_EMPTY = ''; // {}
const TF_REQ_DRIVING = '0a190a0a0d00004e4215b81e05be1204d00fcf0f1a02080128880e';
const TF_REQ_DISTANCE_DRIVING_FERRY = '0a1c0a0a0d00004e4215b81e05be1204d00fcf0f1a02080328880e320101';
const GH_REQ_CYCLING = '0a190a0a0d00004e4215b81e05be1202080520880e280632020002';

const protoResponse = (bodyHex: string) => () => new Response(Buffer.from(bodyHex, 'hex'), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });

const makeClient = (response: () => Response) => {
  const { calls, fn } = recordingFetch(response);
  vi.stubGlobal('fetch', fn);
  const client = new TravelTimeProtoClient({ applicationId: 'app', apiKey: 'key' });
  return { client, calls };
};

const tfRequest = {
  country: 'uk' as const,
  departureLocation: { lat: 51.5, lng: -0.13 },
  destinationCoordinates: [{ lat: 51.51, lng: -0.14 }],
  transportation: 'driving' as const,
  travelTime: 900,
};

const geohashRequest = {
  country: 'uk' as const,
  departureLocation: { lat: 51.5, lng: -0.13 },
  transportation: 'cycling' as const,
  travelTime: 900,
  resolution: 6,
  properties: ['mean', 'max'] as Array<'mean' | 'max'>,
};

const bodyHex = (call: RecordedCall) => Buffer.from(call.init.body as Uint8Array).toString('hex');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TravelTimeProtoClient response shape', () => {
  it('decodes populated properties, repeated fields as plain number arrays', async () => {
    const { client } = makeClient(protoResponse(TF_RES_POPULATED));
    const response = await client.timeFilterFast(tfRequest);
    expect(response).toEqual({ properties: { travelTimes: [600, 0, -1], distances: [100, 0, 250] } });
  });

  it('omits empty repeated fields, keeping the enclosing properties message', async () => {
    const { client } = makeClient(protoResponse(TF_RES_EMPTY_PROPERTIES));
    const response = await client.timeFilterFast(tfRequest);
    expect(response).toEqual({ properties: {} });
    expect(Object.keys(response)).toEqual(['properties']);
  });

  it('renders the error enum as its string name', async () => {
    const { client } = makeClient(protoResponse(TF_RES_ERROR_TOO_MANY_REQUESTS));
    const response = await client.timeFilterFast(tfRequest);
    expect(response).toEqual({ error: { type: 'TOO_MANY_REQUESTS' } });
  });

  it('omits the error type for the zero enum value (UNKNOWN)', async () => {
    const { client } = makeClient(protoResponse(TF_RES_ERROR_UNKNOWN));
    const response = await client.timeFilterFast(tfRequest);
    expect(response).toEqual({ error: {} });
  });

  it('decodes geohash cells with only the requested aggregates present', async () => {
    const { client } = makeClient(protoResponse(GH_RES_POPULATED));
    const response = await client.geohashFast(geohashRequest);
    expect(response).toEqual({ cells: { ids: ['gbsuv', 'gbsuw'], meanTravelTimes: [300, 42] } });
  });

  it('decodes an empty geohash response to an empty object', async () => {
    const { client } = makeClient(protoResponse(GH_RES_EMPTY));
    const response = await client.geohashFast(geohashRequest);
    expect(response).toEqual({});
  });
});

describe('TravelTimeProtoClient request encoding', () => {
  it('encodes a time-filter request to the same bytes and URL as v7', async () => {
    const { client, calls } = makeClient(protoResponse(TF_RES_POPULATED));
    await client.timeFilterFast(tfRequest);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/time-filter/fast/driving');
    expect(bodyHex(calls[0])).toBe(TF_REQ_DRIVING);
  });

  it('keeps a literal + in the transport mode path segment', async () => {
    const { client, calls } = makeClient(protoResponse(TF_RES_POPULATED));
    await client.timeFilterFastDistance({ ...tfRequest, transportation: 'driving+ferry' });
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/time-filter/fast/driving+ferry');
    expect(bodyHex(calls[0])).toBe(TF_REQ_DISTANCE_DRIVING_FERRY);
  });

  it('encodes a geohash request to the same bytes as v7, cycling mapped to the driving URL', async () => {
    const { client, calls } = makeClient(protoResponse(GH_RES_POPULATED));
    await client.geohashFast(geohashRequest);
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/geohash/fast/driving');
    expect(bodyHex(calls[0])).toBe(GH_REQ_CYCLING);
  });
});

describe('TravelTimeProtoClient country validation', () => {
  const badCountry = 'zz' as TimeFilterFastProtoCountry;

  it('rejects an unsupported country before sending, naming the value and the supported list', async () => {
    const { client, calls } = makeClient(protoResponse(TF_RES_POPULATED));
    const call = client.timeFilterFast({ ...tfRequest, country: badCountry });
    await expect(call).rejects.toBeInstanceOf(TravelTimeValidationError);
    await expect(call).rejects.toThrow(/Country "zz" is not supported\. Supported countries: au, .*uk.*/);
    expect(calls).toHaveLength(0);
  });

  it('rejects an unsupported country on the geohash path too', async () => {
    const { client, calls } = makeClient(protoResponse(GH_RES_POPULATED));
    const call = client.geohashFast({ ...geohashRequest, country: badCountry });
    await expect(call).rejects.toBeInstanceOf(TravelTimeValidationError);
    await expect(call).rejects.toThrow('Country "zz" is not supported');
    expect(calls).toHaveLength(0);
  });
});
