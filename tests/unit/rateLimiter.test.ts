import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { RateLimiter } from '../../src/client/rateLimiter';
import {
  TravelTimeClient,
  TravelTimeProtoClient,
  TravelTimeValidationError,
  TimeFilterRequest,
  TransportRetryOptions,
} from '../../src';

/** Observes settlement without awaiting, so a test can assert "still pending". */
function track(promise: Promise<unknown>) {
  const state = { resolved: false, rejected: false };
  promise.then(
    () => { state.resolved = true; },
    () => { state.rejected = true; },
  );
  return state;
}

/** The transport reads the global `fetch` at call time, so tests stub it. */
type RecordedCall = { url: string; init: RequestInit & { headers: Record<string, string> } };

/** A fake fetch that records calls and replays the given responses in order, repeating the last one. */
function recordingFetch(...responses: Array<() => Response>) {
  const calls: RecordedCall[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init: init as RecordedCall['init'] });
    return responses[Math.min(calls.length - 1, responses.length - 1)]();
  };
  vi.stubGlobal('fetch', fn);
  return { calls };
}

const jsonResponse = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status });
const tooManyRequests = jsonResponse(429, { error_code: 5, description: 'Too many requests' });

const timeFilterBody = (searches: number) => ({
  departure_searches: Array.from({ length: searches }, (_, i) => ({ id: `search ${i}` })),
} as unknown as TimeFilterRequest);

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('acquire', () => {
    it('should resolve immediately when the limiter is disabled', async () => {
      const limiter = new RateLimiter();
      const state = track(limiter.acquire(1000));
      await vi.advanceTimersByTimeAsync(0);
      expect(state.resolved).toBe(true);
    });

    it('should reject negative or non-finite hits with TravelTimeValidationError', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60 });
      await expect(limiter.acquire(-1)).rejects.toBeInstanceOf(TravelTimeValidationError);
      await expect(limiter.acquire(NaN)).rejects.toBeInstanceOf(TravelTimeValidationError);
      await expect(limiter.acquire(Infinity)).rejects.toBeInstanceOf(TravelTimeValidationError);
    });

    it('should admit a zero-hit request on the first free slot, still consuming a full pacing slot', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60 });
      const zero = track(limiter.acquire(0)); // e.g. a body with empty search arrays
      const next = track(limiter.acquire(1));

      await vi.advanceTimersByTimeAsync(0);
      expect(zero.resolved).toBe(true); // admitted on the first slot...
      expect(next.resolved).toBe(false); // ...but not admitted for free

      await vi.advanceTimersByTimeAsync(1000);
      expect(next.resolved).toBe(true);
    });

    it('should reject hits above hitsPerMinute instead of deadlocking, leaving the queue usable', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 5 });

      await expect(limiter.acquire(6)).rejects.toBeInstanceOf(TravelTimeValidationError);

      // regression: the old queue kept such a request at its head forever,
      // starving everything queued after it
      const next = track(limiter.acquire(5));
      await vi.advanceTimersByTimeAsync(0);
      expect(next.resolved).toBe(true);
    });

    it('should pace admissions evenly at 60s / hitsPerMinute per hit, never in a burst', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60 }); // 1s per hit
      const offsets: number[] = [];
      const start = Date.now();

      Array.from({ length: 4 }, () => limiter.acquire(1).then(() => offsets.push(Date.now() - start)));

      await vi.advanceTimersByTimeAsync(0);
      expect(offsets).toEqual([0]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(offsets).toEqual([0, 1000]);
      await vi.advanceTimersByTimeAsync(2000);
      expect(offsets).toEqual([0, 1000, 2000, 3000]);
    });

    it('should reserve spacing proportional to the hits of the admitted request', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60 });

      const first = track(limiter.acquire(30)); // reserves 30 one-second slots
      const second = track(limiter.acquire(1));
      await vi.advanceTimersByTimeAsync(0);
      expect(first.resolved).toBe(true);
      expect(second.resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(29_999);
      expect(second.resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(second.resolved).toBe(true);
    });

    it('should forfeit idle time rather than banking it into a burst', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60 });
      await limiter.acquire(1);

      // idle long enough to "save up" ten slots — none of which may be banked
      await vi.advanceTimersByTimeAsync(10_000);

      const states = Array.from({ length: 3 }, () => track(limiter.acquire(1)));
      await vi.advanceTimersByTimeAsync(0);
      expect(states.map((s) => s.resolved)).toEqual([true, false, false]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(states.map((s) => s.resolved)).toEqual([true, true, false]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(states.map((s) => s.resolved)).toEqual([true, true, true]);
    });

    it('should admit waiters in FIFO order, with priority waiters ahead of the queue', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60 });
      const order: string[] = [];

      await limiter.acquire(1);
      limiter.acquire(1).then(() => order.push('queued'));
      limiter.acquire(1, true).then(() => order.push('priority'));

      await vi.advanceTimersByTimeAsync(1000);
      expect(order).toEqual(['priority']);
      await vi.advanceTimersByTimeAsync(1000);
      expect(order).toEqual(['priority', 'queued']);
    });
  });

  describe('backOff', () => {
    it('should pause the whole queue, not just the request that saw the 429', async () => {
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60, timeBetweenRetries: 1000 });

      const pause = track(limiter.backOff());
      const waiting = track(limiter.acquire(1));

      await vi.advanceTimersByTimeAsync(999);
      expect(waiting.resolved).toBe(false);
      expect(pause.resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(waiting.resolved).toBe(true);
      expect(pause.resolved).toBe(true);
    });

    it('should let overlapping back-offs extend the pause rather than cut it short', async () => {
      // regression: the old boolean isSleeping was cleared by whichever retry
      // timer fired first, ending every other pending pause early
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 60, timeBetweenRetries: 1000 });

      limiter.backOff();
      const waiting = track(limiter.acquire(1));

      await vi.advanceTimersByTimeAsync(500);
      limiter.backOff(); // extends the pause to t=1500

      await vi.advanceTimersByTimeAsync(999);
      expect(waiting.resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(waiting.resolved).toBe(true);
    });
  });

  describe('timer lifecycle', () => {
    // Ref-ness is invisible to fake timers, so these tests run on real
    // timers (with short pacing slots), capturing the Timeout objects the
    // limiter creates and recording whether each fired or was cleared.
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;

    const captureTimers = () => {
      const created: NodeJS.Timeout[] = [];
      const fired = new Set<NodeJS.Timeout>();
      const cleared: NodeJS.Timeout[] = [];
      vi.stubGlobal('setTimeout', ((fn: () => void, ms?: number) => {
        const timer: NodeJS.Timeout = realSetTimeout(() => {
          fired.add(timer);
          fn();
        }, ms);
        created.push(timer);
        return timer;
      }) as unknown as typeof setTimeout);
      vi.stubGlobal('clearTimeout', ((timer: NodeJS.Timeout) => {
        cleared.push(timer);
        realClearTimeout(timer);
      }) as unknown as typeof clearTimeout);
      return { created, fired, cleared };
    };

    beforeEach(() => {
      vi.useRealTimers();
    });

    it("should keep the back-off timer ref'd so an awaited pause cannot be dropped on process exit", async () => {
      const { created } = captureTimers();
      const limiter = new RateLimiter({ enabled: true, timeBetweenRetries: 50 });

      const pause = limiter.backOff();
      expect(created).toHaveLength(1);
      // regression: this timer was unref'd, so a process awaiting a 429
      // retry exited with code 0 before the retry ever happened
      expect(created[0].hasRef()).toBe(true);
      await pause;
    });

    it("should keep the drain timer ref'd while waiters queue, and leave no live timer once the queue drains", async () => {
      const { created, fired, cleared } = captureTimers();
      const limiter = new RateLimiter({ enabled: true, hitsPerMinute: 1200 }); // 50ms per slot

      await limiter.acquire(1);
      const blocked = limiter.acquire(1); // paced behind it: schedules a wake-up at the cursor
      expect(created).toHaveLength(1);
      // regression: unref'd, so a process awaiting `blocked` exited mid-wait
      expect(created[0].hasRef()).toBe(true);

      await blocked; // admitted when the wake-up fires
      // every timer the limiter created has been consumed by firing or
      // cleared — nothing lingers to keep an idle process alive
      expect(created.every((timer) => fired.has(timer) || cleared.includes(timer))).toBe(true);
    });
  });

  describe('settings validation', () => {
    it('should reject invalid settings on an enabled limiter with TravelTimeValidationError', () => {
      expect(() => new RateLimiter({ enabled: true, hitsPerMinute: 0 })).toThrow(TravelTimeValidationError);
      expect(() => new RateLimiter({ enabled: true, hitsPerMinute: -10 })).toThrow(TravelTimeValidationError);
      expect(() => new RateLimiter({ enabled: true, retryCount: 0.5 })).toThrow(TravelTimeValidationError);
      expect(() => new RateLimiter({ enabled: true, retryCount: Infinity })).toThrow(TravelTimeValidationError);
      expect(() => new RateLimiter({ enabled: true, timeBetweenRetries: NaN })).toThrow(TravelTimeValidationError);
    });

    it('should not validate settings that a disabled limiter never uses', () => {
      expect(() => new RateLimiter({ hitsPerMinute: -10 })).not.toThrow();
    });
  });

  describe('through TravelTimeClient', () => {
    it('should reject a request costing more hits than the quota without calling the API', async () => {
      const { calls } = recordingFetch(jsonResponse(200, {}));
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 5 },
      });

      // regression: this used to hang forever instead of rejecting
      await expect(client.timeFilter(timeFilterBody(10))).rejects.toBeInstanceOf(TravelTimeValidationError);
      expect(calls).toHaveLength(0);
    });

    it('should space queued requests one pacing interval apart instead of firing them at once', async () => {
      const { calls } = recordingFetch(jsonResponse(200, { results: [] }));
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60 },
      });

      const promise = Promise.all(Array.from({ length: 3 }, () => client.timeFilter(timeFilterBody(1))));
      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(calls).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(1000);
      expect(calls).toHaveLength(3);
      await expect(promise).resolves.toHaveLength(3);
    });

    it('should pace zero-hit requests at the interval too, never draining them in one tick', async () => {
      // regression: bodies with empty search arrays cost 0 hits, and a
      // zero-cost admission used to leave the cursor at `now`, letting the
      // whole queue drain as one unpaced burst of HTTP requests
      const { calls } = recordingFetch(jsonResponse(200, { results: [] }));
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60 },
      });

      const promise = Promise.all(Array.from({ length: 3 }, () => client.timeFilter(timeFilterBody(0))));
      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(calls).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(1000);
      expect(calls).toHaveLength(3);
      await expect(promise).resolves.toHaveLength(3);
    });

    it('should pace by admission interval, not request completion, when responses are slow', async () => {
      // regression for the old one-request-in-flight design: with 3s
      // responses it admitted the next request only on completion (~3s
      // apart), delivering a third of the quota
      const callOffsets: number[] = [];
      const start = Date.now();
      vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => {
        callOffsets.push(Date.now() - start);
        setTimeout(() => resolve(new Response(JSON.stringify({ results: [] }), { status: 200 })), 3000);
      }));
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60 },
      });

      const promise = Promise.all(Array.from({ length: 3 }, () => client.timeFilter(timeFilterBody(1))));
      await vi.advanceTimersByTimeAsync(2000);
      // three admissions at the interval although no request has completed yet
      expect(callOffsets).toEqual([0, 1000, 2000]);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(promise).resolves.toHaveLength(3);
    });

    it('should pause every queued request while a 429 backs off, then retry it first', async () => {
      const { calls } = recordingFetch(
        tooManyRequests,
        jsonResponse(200, { results: [] }),
      );
      // a pause longer than the 1s pacing interval, so this proves the pause
      // rather than pacing is what holds the second request back
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60, timeBetweenRetries: 5000 },
      });

      const first = client.timeFilter(timeFilterBody(1));
      await vi.advanceTimersByTimeAsync(0); // first request went out and got a 429
      expect(calls).toHaveLength(1);

      const second = track(client.timeFilter(timeFilterBody(1)));
      await vi.advanceTimersByTimeAsync(4999);
      // global backpressure: pacing alone would have admitted it at 1s
      expect(calls).toHaveLength(1);
      expect(second.resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(calls).toHaveLength(2); // the 429'd request retries first
      await expect(first).resolves.toEqual({ results: [] });

      await vi.advanceTimersByTimeAsync(1000); // one pacing interval later
      expect(calls).toHaveLength(3);
      await vi.advanceTimersByTimeAsync(0);
      expect(second.resolved).toBe(true);
    });

    it('should give up after retryCount retries and throw the 429', async () => {
      const { calls } = recordingFetch(tooManyRequests);
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: {
          enabled: true, hitsPerMinute: 60, retryCount: 2, timeBetweenRetries: 100,
        },
      });

      const result = track(client.timeFilter(timeFilterBody(1)));
      // attempts land at 0s, 1s and 2s: the retry backs off 100ms but still
      // has to wait for the pacing cursor before being readmitted
      await vi.advanceTimersByTimeAsync(3000);
      expect(calls).toHaveLength(3); // initial attempt + 2 retries
      expect(result.rejected).toBe(true);
    });
  });

  describe('single retry path', () => {
    // `enabled` is not part of TransportRetryOptions, but a JS caller can
    // pass anything — it must be ignored, never honoured, or transport
    // retries multiply with limiter retries (4 x 4 = 16 requests) inside
    // single admissions that consume no pacing slot
    const jsCallerRetry = { enabled: true, baseDelay: 1, maxDelay: 1 } as TransportRetryOptions;

    it('should ignore a JS caller forcing transport retries on while the limiter drives retries', async () => {
      const { calls } = recordingFetch(tooManyRequests);
      const client = new TravelTimeClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60, timeBetweenRetries: 100 },
        retry: jsCallerRetry,
      });

      const result = track(client.timeFilter(timeFilterBody(1)));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(calls).toHaveLength(4); // initial attempt + 3 limiter retries, not 4 x 4
      expect(result.rejected).toBe(true);
    });

    it('should ignore the same forced override on the proto client', async () => {
      const { calls } = recordingFetch(tooManyRequests);
      const client = new TravelTimeProtoClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60, timeBetweenRetries: 100 },
        retry: jsCallerRetry,
      });

      const result = track(client.timeFilterFast({
        country: 'uk',
        departureLocation: { lat: 51.5, lng: -0.1 },
        destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
        transportation: 'driving',
        travelTime: 3600,
      }));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(calls).toHaveLength(4);
      expect(result.rejected).toBe(true);
    });
  });

  describe('through TravelTimeProtoClient', () => {
    it('should retry a 429 with the same whole-queue back-off as the JSON client', async () => {
      const { calls } = recordingFetch(
        tooManyRequests,
        () => new Response(new Uint8Array(0), { status: 200 }),
      );
      const client = new TravelTimeProtoClient({ apiKey: 'test-key', applicationId: 'app-id' }, {
        rateLimitSettings: { enabled: true, hitsPerMinute: 60, timeBetweenRetries: 1000 },
      });

      const promise = client.timeFilterFast({
        country: 'uk',
        departureLocation: { lat: 51.5, lng: -0.1 },
        destinationCoordinates: [{ lat: 51.6, lng: -0.2 }],
        transportation: 'driving',
        travelTime: 3600,
      });

      await vi.advanceTimersByTimeAsync(999);
      expect(calls).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(calls).toHaveLength(2);
      await expect(promise).resolves.toBeDefined();
    });
  });
});
