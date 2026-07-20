/**
 * Sliding-window rate limiter: at most `maxPerInterval` slots can be
 * acquired within any `intervalMs` window. Callers await `acquire()` before
 * making a request; the promise resolves once it's safe to proceed.
 *
 * Note: this state is per module instance (per serverless invocation), so it
 * does not enforce a global limit across concurrent lambda instances. It
 * only protects against bursts from a single process.
 */
export class RateLimiter {
  private readonly timestamps: number[] = [];
  private readonly queue: Array<() => void> = [];
  private draining = false;

  constructor(
    private readonly maxPerInterval: number,
    private readonly intervalMs: number
  ) {}

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.drain();
    });
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      while (
        this.timestamps.length > 0 &&
        now - this.timestamps[0] >= this.intervalMs
      ) {
        this.timestamps.shift();
      }

      if (this.timestamps.length < this.maxPerInterval) {
        this.timestamps.push(now);
        const resolve = this.queue.shift()!;
        resolve();
        continue;
      }

      const delay = this.intervalMs - (now - this.timestamps[0]);
      setTimeout(() => {
        this.draining = false;
        this.drain();
      }, delay);
      return;
    }

    this.draining = false;
  }
}

/** Shared limiter enforcing the WFM API's <= 3 req/s constraint. */
export const wfmRateLimiter = new RateLimiter(3, 1000);
