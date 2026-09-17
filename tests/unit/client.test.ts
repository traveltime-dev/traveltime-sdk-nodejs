import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import { TravelTimeClient, TravelTimeError, TimeMapFastRequest } from '../../src';

/**
 * The transport reads the global `fetch` at call time, so tests stub it. The
 * status is chosen from the request body rather than the call order, so
 * assertions hold however the requests interleave.
 */
function stubFetch(statusFor: (body: string) => number) {
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const status = statusFor(String(init.body ?? ''));
    return status === 200
      ? new Response(JSON.stringify({ results: [] }), { status })
      : new Response(JSON.stringify({ error_code: 5, description: 'nope' }), { status });
  });
}

const client = () => new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' });

describe('TravelTimeClient batch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports a failed body as a TravelTimeError alongside the successes', async () => {
    stubFetch((body) => (body.includes('"b"') ? 400 : 200));
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

  it('maps a failure thrown before the request leaves, instead of letting it escape raw', async () => {
    stubFetch(() => 200);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await expect(client().timeFilter(circular as never)).rejects.toSatisfy(
      (error: unknown) => TravelTimeError.isTravelTimeError(error),
    );
  });

  it('classifies a malformed body the same way whether the rate limiter is on or off', async () => {
    stubFetch(() => 400);
    const limited = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
      rateLimitSettings: { enabled: true, hitsPerMinute: 600 },
    });

    const [onLimiter, offLimiter] = await Promise.all([
      limited.timeMapFast({} as TimeMapFastRequest).catch((error) => error),
      client().timeMapFast({} as TimeMapFastRequest).catch((error) => error),
    ]);

    expect(onLimiter.name).toBe(offLimiter.name);
    expect(onLimiter.status).toBe(400);
    expect(offLimiter.status).toBe(400);
  });
});
