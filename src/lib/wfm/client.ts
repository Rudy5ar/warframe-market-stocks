import "server-only";

import { wfmRateLimiter } from "./rateLimiter";

/**
 * Server-only client for the Warframe.market v1 API.
 *
 * v1 is deprecated by WFM in favor of v2, but v2 has no per-item statistics
 * endpoint, so v1 is kept here solely to serve items/orders/statistics.
 * Never import this module from client components.
 */

const WFM_BASE_URL = "https://api.warframe.market/v1";
const WFM_LANGUAGE = "en";
const WFM_FETCH_TIMEOUT_MS = 15_000;

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 500;

export class WfmApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = "WfmApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUserAgent(): string {
  const userAgent = process.env.WFM_USER_AGENT;
  if (!userAgent) {
    throw new Error(
      "WFM_USER_AGENT env var is required to call the Warframe.market API"
    );
  }
  return userAgent;
}

function retryDelayMs(res: Response, attempt: number): number {
  const retryAfterHeader = res.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return BASE_RETRY_DELAY_MS * 2 ** attempt;
}

/**
 * Calls a Warframe.market v1 endpoint and returns its `payload` field.
 * Rate-limited to <= 3 req/s and retried with backoff on 429.
 */
export async function wfmRequest<TPayload>(path: string): Promise<TPayload> {
  const url = `${WFM_BASE_URL}${path}`;
  const headers = {
    Accept: "application/json",
    Language: WFM_LANGUAGE,
    "User-Agent": getUserAgent(),
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await wfmRateLimiter.acquire();
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(WFM_FETCH_TIMEOUT_MS),
    });

    if (res.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new WfmApiError("Rate limited after max retries", res.status, url);
      }
      await sleep(retryDelayMs(res, attempt));
      continue;
    }

    if (!res.ok) {
      throw new WfmApiError(`WFM request failed: ${res.status}`, res.status, url);
    }

    const json = (await res.json()) as { payload: TPayload };
    return json.payload;
  }

  // Unreachable, but keeps TS happy about the return type.
  throw new WfmApiError("WFM request failed", 0, url);
}
