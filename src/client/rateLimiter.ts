import crypto from 'crypto';

export type RateLimitSettings = {
  enabled: boolean
  hitsPerMinute: number
}
type Task<T = any> = () => Promise<T> | T;

export class RateLimiter {
  private rateLimitSettings: RateLimitSettings;
  private requestQueue: Array<{ task: Task, hits: number }>;
  private completedQueue: Set<string>;
  private isThrottleActive: boolean;
  private isRequestInProgress: boolean;

  constructor(
    rateLimitSettings?: Partial<RateLimitSettings>,
  ) {
    this.requestQueue = [];
    this.completedQueue = new Set();
    this.isThrottleActive = false;
    this.isRequestInProgress = false;
    this.rateLimitSettings = {
      enabled: true,
      hitsPerMinute: 60,
      ...rateLimitSettings,
    };
  }

  private disableThrottle(hits: number) {
    if (!this.isThrottleActive) return;
    setTimeout(() => {
      this.isThrottleActive = false;
      if (this.requestQueue.length > 0) this.execute();
    }, ((60 * 1000) / this.rateLimitSettings.hitsPerMinute) * hits);
  }

  private taskCleanUp(ids: string[]) {
    this.isRequestInProgress = false;
    if (this.requestQueue.length > 0) this.execute();
    setTimeout(() => {
      ids.forEach((id) => this.completedQueue.delete(id));
      this.execute();
    }, 1000 * 60);
  }

  private async execute() {
    if (this.isRequestInProgress || this.isThrottleActive) return;
    const request = this.requestQueue.shift();
    if (!request) return;
    if (this.completedQueue.size + request.hits <= this.rateLimitSettings.hitsPerMinute) {
      this.isThrottleActive = true;
      this.isRequestInProgress = true;
      const uuids = [...Array(request.hits).keys()].map(() => crypto.randomUUID());
      uuids.forEach((id) => this.completedQueue.add(id));
      this.disableThrottle(uuids.length);
      await request.task();
      this.taskCleanUp(uuids);
    } else {
      this.requestQueue.unshift(request);
    }
  }

  addAndExecute(request: Task, hits: number) {
    this.requestQueue.push({ task: request, hits });
    this.execute();
  }

  isEnabled() {
    return this.rateLimitSettings.enabled;
  }

  setRateLimitSettings = (settings: Partial<RateLimitSettings>) => {
    this.rateLimitSettings = {
      ...this.rateLimitSettings,
      ...settings,
    };
  };
}
