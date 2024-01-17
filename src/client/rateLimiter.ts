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
type Task<T = any> = () => Promise<T> | T;

export class RateLimiter {
  private rateLimitSettings: RateLimitSettings;
  private requestQueue: Array<{ task: Task, hits: number }>;
  private completedQueueSize: number;
  private isThrottleActive: boolean;
  private isRequestInProgress: boolean;
  private isSleeping: boolean;

  constructor(
    rateLimitSettings?: Partial<RateLimitSettings>,
  ) {
    this.requestQueue = [];
    this.completedQueueSize = 0;
    this.isThrottleActive = false;
    this.isRequestInProgress = false;
    this.isSleeping = false;
    this.rateLimitSettings = {
      enabled: false,
      hitsPerMinute: 60,
      retryCount: 3,
      timeBetweenRetries: 1000,
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
    if (this.isRequestInProgress || this.isThrottleActive || this.isSleeping) return;
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

  addAndExecute(request: Task, hits: number, priority = false) {
    if (priority) {
      this.requestQueue.unshift({ task: request, hits });
    } else {
      this.requestQueue.push({ task: request, hits });
    }
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

  getRetryCount = () => this.rateLimitSettings.retryCount;
  getTimeBetweenRetries = () => this.rateLimitSettings.timeBetweenRetries;
  setIsSleeping = (isSleeping: boolean) => {
    this.isSleeping = isSleeping;
  };
}
