import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import { TravelTimeClient, TravelTimeError, TimeMapFastRequest } from '../../src';

/** The transport reads the global `fetch` at call time, so tests stub it. */
function stubFetch(...statuses: number[]) {
  let call = 0;
  vi.stubGlobal('fetch', async () => {
    const status = statuses[Math.min(call, statuses.length - 1)];
    call += 1;
    return status === 200
      ? new Response(JSON.stringify({ results: [] }), { status })
      : new Response(JSON.stringify({ error_code: 5, description: 'nope' }), { status });
  });
}

const client = () => new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' });

describe('TravelTimeClient batch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports a failed body as a TravelTimeError alongside the successes', async () => {
    stubFetch(200, 400);
    const results = await client().timeFilterBatch([
      { departure_searches: [{ id: 'a' }] },
      { departure_searches: [{ id: 'b' }] },
    ] as never);

    expect(results.map((r) => r.type)).toEqual(['success', 'error']);
    const failed = results[1];
    if (failed.type !== 'error') throw new Error('expected an error entry');
    // BatchResponse.error is typed TravelTimeError, not Error, so consumers can
    // read status and isRetryable without casting
    expect(TravelTimeError.isTravelTimeError(failed.error)).toBe(true);
    expect(failed.error.status).toBe(400);
    expect(failed.error.isRetryable).toBe(false);
  });
});

describe('TravelTimeClient error mapping boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps a failure raised while counting hits, instead of letting it escape raw', async () => {
    stubFetch(200);
    // /time-map/fast counts hits from arrival_searches; omitting it made hit
    // counting throw a TypeError that escaped request() unmapped
    const limited = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
      rateLimitSettings: { enabled: true, hitsPerMinute: 600 },
    });

    await expect(limited.timeMapFast({} as TimeMapFastRequest)).rejects.toSatisfy(
      (error: unknown) => TravelTimeError.isTravelTimeError(error),
    );
  });
});
