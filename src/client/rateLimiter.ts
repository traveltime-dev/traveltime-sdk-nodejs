export type RateLimitSettings = {
  enabled: boolean
  hitsPerMinute: number
}
type Task<T = any> = () => Promise<T> | T;

export class RateLimiter {
  private rateLimitSettings: RateLimitSettings;
  private requestQueue: Array<{ task: Task, hits: number }>;
  private completedQueueSize: number;
  private isThrottleActive: boolean;
  private isRequestInProgress: boolean;

  constructor(
    rateLimitSettings?: Partial<RateLimitSettings>,
  ) {
    this.requestQueue = [];
    this.completedQueueSize = 0;
    this.isThrottleActive = false;
    this.isRequestInProgress = false;
    this.rateLimitSettings = {
      enabled: false,
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

  private taskCleanUp(amount: number) {
    this.isRequestInProgress = false;
    if (this.requestQueue.length > 0) this.execute();
    setTimeout(() => {
      this.completedQueueSize -= amount;
      this.execute();
    }, 1000 * 60);
  }

  private async execute() {
    if (this.isRequestInProgress || this.isThrottleActive) return;
    const request = this.requestQueue.shift();
    if (!request) return;
    if (this.completedQueueSize + request.hits <= this.rateLimitSettings.hitsPerMinute) {
      this.isThrottleActive = true;
      this.isRequestInProgress = true;
      this.completedQueueSize += request.hits;
      this.disableThrottle(request.hits);
      await request.task();
      this.taskCleanUp(request.hits);
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
