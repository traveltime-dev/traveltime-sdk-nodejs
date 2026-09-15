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
// { cells: { ids: [0x8928308280fffff, 0x8928308280bffff], meanTravelTimes: [300, 42] } }
// ids travel as fixed64; the client hands them back in 15-character hex form.
const H3_RES_POPULATED = '0a170a10ffff0f2808839208ffff0b28088392082203d80454';
const TF_REQ_DRIVING = '0a190a0a0d00004e4215b81e05be1204d00fcf0f1a02080128880e';
const TF_REQ_DISTANCE_DRIVING_FERRY = '0a1c0a0a0d00004e4215b81e05be1204d00fcf0f1a02080328880e320101';
const GH_REQ_CYCLING = '0a190a0a0d00004e4215b81e05be1202080520880e280632020002';

const protoResponse = (bodyHex: string) => () => new Response(Buffer.from(bodyHex, 'hex'), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });

const makeClient = (response: () => Response, baseUrl?: string) => {
  const { calls, fn } = recordingFetch(response);
  vi.stubGlobal('fetch', fn);
  const client = new TravelTimeProtoClient({ applicationId: 'app', apiKey: 'key' }, { baseUrl });
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

  it('encodes a geohash request to the same bytes as v7, cycling on its own endpoint', async () => {
    const { client, calls } = makeClient(protoResponse(GH_RES_POPULATED));
    await client.geohashFast(geohashRequest);
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/geohash/fast/cycling');
    expect(bodyHex(calls[0])).toBe(GH_REQ_CYCLING);
  });

  it('sends bare cycling time-filter requests to the cycling endpoint', async () => {
    const { client, calls } = makeClient(protoResponse(TF_RES_POPULATED));
    await client.timeFilterFast({ ...tfRequest, transportation: 'cycling' });
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/time-filter/fast/cycling');
  });
});

describe('TravelTimeProtoClient h3', () => {
  const h3Request = {
    country: 'uk' as const,
    departureLocation: { lat: 51.5, lng: -0.13 },
    transportation: 'driving+ferry' as const,
    travelTime: 900,
    resolution: 7,
  };

  it('builds the h3 request path', async () => {
    const { client, calls } = makeClient(protoResponse(H3_RES_POPULATED));
    await client.h3Fast(h3Request);
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/h3/fast/driving+ferry');
  });

  it('converts fixed64 cell ids to their 15-character hex form', async () => {
    const { client } = makeClient(protoResponse(H3_RES_POPULATED));
    const response = await client.h3Fast(h3Request);
    expect(response).toEqual({
      cells: { ids: ['8928308280fffff', '8928308280bffff'], meanTravelTimes: [300, 42] },
    });
  });

  it('decodes an empty h3 response to an empty object', async () => {
    const { client } = makeClient(protoResponse(''));
    expect(await client.h3Fast(h3Request)).toEqual({});
  });
});

describe('TravelTimeProtoClient country casing', () => {
  const upper = 'UK' as TimeFilterFastProtoCountry;

  it('lowercases the country segment, leaving the base URL as given', async () => {
    const { client, calls } = makeClient(protoResponse(TF_RES_POPULATED), 'https://proxy.example/API/v3');
    await client.timeFilterFast({ ...tfRequest, country: upper });
    expect(calls[0].url).toBe('https://proxy.example/API/v3/uk/time-filter/fast/driving');
  });

  it('lowercases the country segment on the geohash path too', async () => {
    const { client, calls } = makeClient(protoResponse(GH_RES_POPULATED));
    await client.geohashFast({ ...geohashRequest, country: upper });
    expect(calls[0].url).toBe('https://proto.api.traveltimeapp.com/api/v3/uk/geohash/fast/cycling');
  });
});

describe('TravelTimeProtoClient search direction', () => {
  const base = {
    country: 'uk' as const,
    destinationCoordinates: [{ lat: 51.51, lng: -0.14 }],
    transportation: 'pt' as const,
    travelTime: 900,
  };
  const location = { lat: 51.5, lng: -0.13 };

  it('builds a manyToOneRequest for arrivalLocation', () => {
    const { client } = makeClient(protoResponse(TF_RES_POPULATED));
    const { requestMessage } = (client as any).buildProtoRequest({ ...base, arrivalLocation: location });

    expect(requestMessage.oneToManyRequest).toBeUndefined();
    expect(requestMessage.manyToOneRequest.arrivalLocation).toEqual(location);
    expect(requestMessage.manyToOneRequest.locationDeltas).toHaveLength(2);
  });

  it('rejects zero or two locations', async () => {
    const { client, calls } = makeClient(protoResponse(TF_RES_POPULATED));
    await expect(client.timeFilterFast(base as any)).rejects
      .toThrow('Either departureLocation or arrivalLocation must be provided');
    await expect(client.timeFilterFast({ ...base, departureLocation: location, arrivalLocation: location } as any)).rejects
      .toThrow('Only one of departureLocation or arrivalLocation can be provided');
    expect(calls).toHaveLength(0);
  });

  it('rejects zero or two locations on the cell endpoints', async () => {
    const { client, calls } = makeClient(protoResponse(GH_RES_POPULATED));
    const { departureLocation, ...noLocation } = geohashRequest;
    await expect(client.geohashFast(noLocation as any)).rejects
      .toThrow('Either departureLocation or arrivalLocation must be provided');
    expect(calls).toHaveLength(0);
  });
});

describe('TravelTimeProtoClient request properties', () => {
  it('sets the fares property only for the fares request', () => {
    const { client } = makeClient(protoResponse(TF_RES_POPULATED));
    const build = (options?: object) => (client as any)
      .buildProtoRequest(tfRequest, options).requestMessage.oneToManyRequest.properties;

    expect(build()).toBeUndefined();
    expect(build({ useFares: true })).toEqual([0]);
    expect(build({ useDistance: true })).toEqual([1]);
  });

  it('includes removeWaterBodies only when set', () => {
    const { client } = makeClient(protoResponse(GH_RES_POPULATED));
    const build = (extra?: object) => (client as any)
      .buildCellProtoRequest({ ...geohashRequest, ...extra }, 'geohash').requestMessage.oneToManyRequest;

    expect(build()).not.toHaveProperty('removeWaterBodies');
    expect(build({ removeWaterBodies: false }).removeWaterBodies).toBe(false);
    expect(build({ removeWaterBodies: true }).removeWaterBodies).toBe(true);
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
