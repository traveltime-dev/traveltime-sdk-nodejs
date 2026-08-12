import { TravelTimeValidationError } from '../error';

export type RateLimitSettings = {
  enabled: boolean
  hitsPerMinute: number
  /**
   * Determines how many times request should be repeated when API returns status `429`.
   *
   * Default is `3`
   */
  retryCount: number
  /**
   * Determines how often retry should happen.
   *
   * Time units - `milliseconds`.
   *
   * Default is `1000`
   */
  timeBetweenRetries: number
}

const MINUTE_MS = 60_000;

type Waiter = {
  hits: number
  resolve: () => void
};

function validateSettings(settings: RateLimitSettings) {
  if (!Number.isFinite(settings.hitsPerMinute) || settings.hitsPerMinute <= 0) {
    throw new TravelTimeValidationError('hitsPerMinute must be a positive number');
  }
  if (!Number.isInteger(settings.retryCount) || settings.retryCount < 0) {
    throw new TravelTimeValidationError('retryCount must be a non-negative integer');
  }
  if (!Number.isFinite(settings.timeBetweenRetries) || settings.timeBetweenRetries < 0) {
    throw new TravelTimeValidationError('timeBetweenRetries must be a non-negative number of milliseconds');
  }
}

/**
 * Paced rate limiter: admissions are spread evenly across the minute, each
 * admitted request reserving `hits * (60s / hitsPerMinute)` of spacing after
 * it, so a client cannot hammer the API in bursts. Idle time is forfeited
 * rather than banked — going quiet earns no credit to burst with later.
 *
 * The limiter only gates admission and never awaits the caller's request, so
 * response latency does not reduce throughput below the quota rate. Waiters
 * are admitted in FIFO order.
 *
 * Timer lifecycle: every timer here resolves a promise some caller is
 * awaiting (a queued waiter or a back-off pause), so timers stay ref'd —
 * unref'ing them would let the process exit with pending requests silently
 * dropped. A wake-up timer exists only while waiters are queued: each firing
 * consumes it, and it is only ever (re)scheduled when waiters remain. An
 * idle limiter therefore holds no timers and never keeps the process alive.
 */
export class RateLimiter {
  private settings: RateLimitSettings;
  private queue: Waiter[] = [];
  /** Earliest time the next admission may happen — the pacing cursor. */
  private nextAdmitAt = 0;
  private pausedUntil = 0;
  private timer: NodeJS.Timeout | undefined;
  private timerAt = Infinity;

  constructor(
    rateLimitSettings?: Partial<RateLimitSettings>,
  ) {
    this.settings = {
      enabled: false,
      hitsPerMinute: 60,
      retryCount: 3,
      timeBetweenRetries: 1000,
      ...rateLimitSettings,
    };
    if (this.settings.enabled) validateSettings(this.settings);
  }

  isEnabled() {
    return this.settings.enabled;
  }

  getRetryCount = () => this.settings.retryCount;
  getTimeBetweenRetries = () => this.settings.timeBetweenRetries;

  /**
   * Resolves once the request may be sent, pacing admissions evenly at
   * `60s / hitsPerMinute` per hit. `priority` admits ahead of already-queued
   * waiters, which keeps a 429 retry from starting over at the back of the
   * queue.
   *
   * Rejects immediately with `TravelTimeValidationError` when `hits` exceeds
   * `hitsPerMinute` — such a request is over the per-minute allowance and
   * would be rejected by the API no matter how long it waited — or when
   * `hits` is not a non-negative finite number, which keeps the pacing
   * arithmetic sound.
   */
  acquire(hits: number, priority = false): Promise<void> {
    if (!this.settings.enabled) return Promise.resolve();
    if (!Number.isFinite(hits) || hits < 0) {
      return Promise.reject(new TravelTimeValidationError('hits must be a non-negative finite number'));
    }
    if (hits > this.settings.hitsPerMinute) {
      return Promise.reject(new TravelTimeValidationError(
        `Request needs ${hits} hits but the rate limit allows ${this.settings.hitsPerMinute} hits per minute, so it can never be admitted`,
      ));
    }
    return new Promise((resolve) => {
      const waiter: Waiter = { hits, resolve };
      if (priority) {
        this.queue.unshift(waiter);
      } else {
        this.queue.push(waiter);
      }
      this.drain();
    });
  }

  /**
   * Whole-queue backpressure for HTTP 429: pauses every pending acquisition
   * for `timeBetweenRetries` — when the server says slow down, the entire
   * queue stops, not just the request that was rejected. Overlapping calls
   * extend the pause rather than cutting it short. The returned promise
   * resolves once this call's pause has elapsed.
   */
  backOff(): Promise<void> {
    const { timeBetweenRetries } = this.settings;
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + timeBetweenRetries);
    return new Promise((resolve) => {
      // ref'd on purpose: the caller awaits this before retrying, so the
      // process must not exit until the pause has elapsed
      setTimeout(resolve, timeBetweenRetries);
    });
  }

  /** Admits the queue head once the pacing cursor and any pause allow it. */
  private drain() {
    const now = Date.now();
    if (now < this.pausedUntil) {
      if (this.queue.length > 0) this.scheduleDrain(this.pausedUntil);
      return;
    }
    if (now < this.nextAdmitAt) {
      if (this.queue.length > 0) this.scheduleDrain(this.nextAdmitAt);
      return;
    }
    const waiter = this.queue.shift();
    if (waiter === undefined) return;
    // Every admission costs at least one pacing slot, even when the hit
    // accounting says zero (e.g. bodies with empty search arrays): the quota
    // caps requests reaching the API, not just billed hits. This also moves
    // the cursor past `now`, so each drain admits exactly one waiter.
    // `now + cost`, never `nextAdmitAt + cost`: idle time is forfeited, not
    // banked, so a client that went quiet cannot burst afterwards.
    this.nextAdmitAt = now + (MINUTE_MS / this.settings.hitsPerMinute) * Math.max(waiter.hits, 1);
    waiter.resolve();
    // No stale timer can survive the queue emptying: a wake-up is only ever
    // scheduled while waiters remain, an acquire-triggered drain leaves the
    // acquiring waiter queued whenever it admits an older head, and a
    // timer-triggered drain has already consumed its timer.
    if (this.queue.length > 0) this.scheduleDrain(this.nextAdmitAt);
  }

  /**
   * Schedules the next drain, keeping at most one timer — the earliest wins.
   * The timer stays ref'd: it only exists while queued waiters are awaited.
   */
  private scheduleDrain(at: number) {
    if (this.timer !== undefined) {
      if (this.timerAt <= at) return;
      clearTimeout(this.timer);
    }
    this.timerAt = at;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.timerAt = Infinity;
      this.drain();
    }, Math.max(0, at - Date.now()));
  }
}
